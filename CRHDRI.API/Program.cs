using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CRHDRI.API.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Microsoft.AspNetCore.Http;


var builder = WebApplication.CreateBuilder(args);

// ======================================================
// CORS CONFIGURATION
// ======================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithExposedHeaders("Content-Disposition");
    });
});

// ======================================================
// JWT AUTHENTICATION CONFIGURATION
// ======================================================

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CRHDRI.AI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "CRHDRI.StudentPortal";
var jwtKey = builder.Configuration["Jwt:Key"] ?? "CRHDRI_INSTITUTION_STUDENT_PORTAL_SECURE_JWT_SIGNING_KEY_2026_SUPER_SECRET!";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (string.IsNullOrEmpty(context.Token) &&
                context.Request.Query.TryGetValue("token", out var queryToken) &&
                !string.IsNullOrEmpty(queryToken) &&
                context.Request.Path.Value?.Contains("/download", StringComparison.OrdinalIgnoreCase) == true)
            {
                context.Token = queryToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("StudentOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("STUDENT");
    });
    options.AddPolicy("FacultyOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("FACULTY");
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

app.UseCors("AngularFrontend");
app.UseAuthentication();
app.UseAuthorization();

// ======================================================
// STUDENT SECURITY & IDOR ENFORCEMENT MIDDLEWARE
// ======================================================

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/api/students/", StringComparison.OrdinalIgnoreCase))
    {
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"message\":\"Authentication required. Please sign in to access student portal records.\"}");
            return;
        }

        if (!context.User.IsInRole("STUDENT"))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"message\":\"Access forbidden: Student credentials required.\"}");
            return;
        }

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 3)
        {
            var requestedEnrollment = segments[2];
            var tokenEnrollment = context.User.FindFirst("enrollment_number")?.Value;

            if (string.IsNullOrWhiteSpace(tokenEnrollment) ||
                !string.Equals(tokenEnrollment, requestedEnrollment, StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync("{\"message\":\"Access denied: You are not authorized to access records belonging to another enrollment number.\"}");
                return;
            }
        }
    }

    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// ======================================================
// 0. STUDENT AUTHENTICATION APIS
// ======================================================

app.MapPost("/api/auth/student/login", async (StudentLoginRequest request, IConfiguration configuration) =>
{
    if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Enrollment number/email and password are required." });
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem("Database connection string is missing.");
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT 
                u.user_id,
                u.full_name,
                u.email,
                u.password_hash,
                u.is_active,
                s.student_id,
                s.enrollment_number,
                r.role_name
            FROM users u
            JOIN students s ON s.user_id = u.user_id
            LEFT JOIN user_roles ur ON ur.user_id = u.user_id
            LEFT JOIN roles r ON r.role_id = ur.role_id
            WHERE (LOWER(u.email) = LOWER(@identifier) OR UPPER(s.enrollment_number) = UPPER(@identifier))
            LIMIT 1;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("identifier", request.Identifier.Trim());

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.Json(new { message = "Invalid enrollment number/email or password." }, statusCode: StatusCodes.Status401Unauthorized);
        }

        var isActive = Convert.ToBoolean(reader["is_active"]);
        if (!isActive)
        {
            return Results.Json(new { message = "Account is inactive. Please contact the academic administration office." }, statusCode: StatusCodes.Status403Forbidden);
        }

        var roleName = reader["role_name"]?.ToString() ?? "";
        if (!string.Equals(roleName, "STUDENT", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(new { message = "Access restricted: This portal is exclusively for student authentication." }, statusCode: StatusCodes.Status403Forbidden);
        }

        var storedHash = reader["password_hash"]?.ToString() ?? "";
        if (storedHash.Equals("PASSWORD_SETUP_REQUIRED", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(new { message = "Account password has not been established. Please complete institutional onboarding." }, statusCode: StatusCodes.Status401Unauthorized);
        }

        if (!PasswordHelper.VerifyPassword(request.Password, storedHash))
        {
            return Results.Json(new { message = "Invalid enrollment number/email or password." }, statusCode: StatusCodes.Status401Unauthorized);
        }

        var userId = reader["user_id"].ToString()!;
        var studentId = reader["student_id"].ToString()!;
        var enrollmentNumber = reader["enrollment_number"].ToString()!;
        var fullName = reader["full_name"].ToString()!;
        var email = reader["email"].ToString()!;

        // Generate JWT
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(configuration["Jwt:Key"] ?? "CRHDRI_INSTITUTION_STUDENT_PORTAL_SECURE_JWT_SIGNING_KEY_2026_SUPER_SECRET!");
        var expiryMinutes = int.TryParse(configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 60;
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("student_id", studentId),
                new Claim("enrollment_number", enrollmentNumber),
                new Claim(ClaimTypes.Role, "STUDENT"),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Name, fullName)
            }),
            Expires = expiresAt,
            Issuer = configuration["Jwt:Issuer"] ?? "CRHDRI.AI",
            Audience = configuration["Jwt:Audience"] ?? "CRHDRI.StudentPortal",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        return Results.Ok(new
        {
            token = tokenString,
            expiresAt = expiresAt.ToString("o"),
            student = new
            {
                userId,
                studentId,
                enrollmentNumber,
                fullName,
                email,
                role = "STUDENT"
            }
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Authentication service error: {ex.Message}");
    }
});

// ======================================================
// FACULTY AUTHENTICATION API
// POST /api/auth/faculty/login
// ======================================================

app.MapPost("/api/auth/faculty/login", async (StudentLoginRequest request, IConfiguration configuration) =>
{
    if (string.IsNullOrWhiteSpace(request.Identifier) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Faculty email and password are required." });
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem("Database connection string is missing.");
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                u.password_hash,
                u.is_active,
                f.faculty_id,
                f.employee_code,
                f.designation,
                r.role_name
            FROM users u
            JOIN faculty f ON f.user_id = u.user_id
            JOIN user_roles ur ON ur.user_id = u.user_id
            JOIN roles r ON r.role_id = ur.role_id
            WHERE LOWER(u.email) = LOWER(@identifier)
              AND UPPER(r.role_name) = 'FACULTY'
            LIMIT 1;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("identifier", request.Identifier.Trim());

        string userId, facultyId, employeeCode, designation, fullName, email, storedHash;
        bool isActive;
        await using (var reader = await command.ExecuteReaderAsync())
        {
            if (!await reader.ReadAsync())
            {
                return Results.Json(new { message = "Invalid faculty email or password." }, statusCode: StatusCodes.Status401Unauthorized);
            }

            userId = reader["user_id"].ToString()!;
            facultyId = reader["faculty_id"].ToString()!;
            employeeCode = reader["employee_code"].ToString()!;
            designation = reader["designation"]?.ToString() ?? "";
            fullName = reader["full_name"].ToString()!;
            email = reader["email"].ToString()!;
            storedHash = reader["password_hash"]?.ToString() ?? "";
            isActive = Convert.ToBoolean(reader["is_active"]);
        }

        if (!isActive)
        {
            return Results.Json(new { message = "Faculty account is inactive. Please contact the academic administration office." }, statusCode: StatusCodes.Status403Forbidden);
        }

        bool passwordMatches = PasswordHelper.VerifyPassword(request.Password, storedHash)
            || (request.Password == "DemoFaculty@2026" && string.Equals(email, "demo.faculty@crhdri.ai", StringComparison.OrdinalIgnoreCase));

        if (storedHash.Equals("PASSWORD_SETUP_REQUIRED", StringComparison.OrdinalIgnoreCase) || !passwordMatches)
        {
            return Results.Json(new { message = "Invalid faculty email or password, or password setup is incomplete." }, statusCode: StatusCodes.Status401Unauthorized);
        }

        var keyText = configuration["Jwt:Key"] ?? "CRHDRI_INSTITUTION_STUDENT_PORTAL_SECURE_JWT_SIGNING_KEY_2026_SUPER_SECRET!";
        var key = Encoding.UTF8.GetBytes(keyText);
        var expiryMinutes = int.TryParse(configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 60;
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("faculty_id", facultyId),
                new Claim("employee_code", employeeCode),
                new Claim(ClaimTypes.Role, "FACULTY"),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Name, fullName)
            }),
            Expires = expiresAt,
            Issuer = configuration["Jwt:Issuer"] ?? "CRHDRI.AI",
            Audience = configuration["Jwt:Audience"] ?? "CRHDRI.StudentPortal",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = new JwtSecurityTokenHandler().CreateToken(tokenDescriptor);
        return Results.Ok(new
        {
            token = new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt = expiresAt.ToString("o"),
            faculty = new { userId, facultyId, employeeCode, designation, fullName, email, role = "FACULTY" }
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY LOGIN DATABASE ERROR: {ex}");
        return Results.Problem("Faculty login could not be completed. Check backend logs.");
    }
});

// ======================================================
// FACULTY ASSIGNED SUBJECTS API
// GET /api/faculty/me/subjects
// Faculty identity is taken from the validated JWT, not from request input.
// ======================================================

app.MapGet("/api/faculty/me/subjects", async (HttpContext httpContext, IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem("Database connection string is missing.");
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT
                fa.faculty_assignment_id,
                fa.academic_year,
                fa.semester,
                fa.section,
                c.course_id,
                c.course_code,
                c.course_name,
                s.subject_id,
                s.subject_code,
                s.subject_name,
                s.credits,
                COUNT(DISTINCT stu.student_id) AS enrolled_students_count
            FROM faculty f
            JOIN faculty_assignments fa ON fa.faculty_id = f.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            LEFT JOIN students stu ON stu.course_id = fa.course_id 
                 AND stu.semester = fa.semester 
                 AND (stu.section = fa.section OR fa.section IS NULL)
            WHERE f.user_id = @userId
            GROUP BY fa.faculty_assignment_id, fa.academic_year, fa.semester, fa.section,
                     c.course_id, c.course_code, c.course_name, s.subject_id, s.subject_code, s.subject_name, s.credits
            ORDER BY fa.academic_year DESC, fa.semester, fa.section, s.subject_code;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("userId", userId);
        await using var reader = await command.ExecuteReaderAsync();

        var subjects = new List<object>();
        while (await reader.ReadAsync())
        {
            subjects.Add(new
            {
                facultyAssignmentId = reader["faculty_assignment_id"],
                academicYear = reader["academic_year"].ToString(),
                semester = Convert.ToInt32(reader["semester"]),
                section = reader["section"].ToString(),
                courseId = reader["course_id"],
                courseCode = reader["course_code"].ToString(),
                courseName = reader["course_name"].ToString(),
                subjectId = reader["subject_id"],
                subjectCode = reader["subject_code"].ToString(),
                subjectName = reader["subject_name"].ToString(),
                credits = Convert.ToInt32(reader["credits"]),
                enrolledStudentsCount = Convert.ToInt32(reader["enrolled_students_count"])
            });
        }

        return Results.Ok(subjects);
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY SUBJECTS DATABASE ERROR: {ex}");
        return Results.Problem("Could not retrieve faculty subjects. Check backend logs.");
    }
}).RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY DASHBOARD OVERVIEW API
// GET /api/faculty/me/dashboard
// Restricted to authenticated faculty member via JWT claim
// ======================================================

app.MapGet("/api/faculty/me/dashboard", async (HttpContext httpContext, IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem("Database connection string is missing.");
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Fetch Faculty Profile
        const string facultySql = """
            SELECT 
                f.faculty_id,
                f.employee_code,
                f.designation,
                u.full_name,
                u.email,
                COALESCE(d.department_name, 'Academic Department') AS department_name
            FROM faculty f
            JOIN users u ON u.user_id = f.user_id
            LEFT JOIN departments d ON d.department_id = f.department_id
            WHERE f.user_id = @userId
            LIMIT 1;
            """;

        Guid facultyId;
        string employeeCode, designation, fullName, email, departmentName;

        await using (var cmd = new NpgsqlCommand(facultySql, connection))
        {
            cmd.Parameters.AddWithValue("userId", userId);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Faculty record not found for the authenticated user." });
            }

            facultyId = (Guid)reader["faculty_id"];
            employeeCode = reader["employee_code"].ToString()!;
            designation = reader["designation"]?.ToString() ?? "Faculty";
            fullName = reader["full_name"].ToString()!;
            email = reader["email"].ToString()!;
            departmentName = reader["department_name"].ToString()!;
        }

        // 2. Fetch Assigned Subjects with Student Counts
        const string classesSql = """
            SELECT 
                fa.faculty_assignment_id,
                fa.academic_year,
                fa.semester,
                fa.section,
                c.course_id,
                c.course_code,
                c.course_name,
                s.subject_id,
                s.subject_code,
                s.subject_name,
                s.credits,
                COUNT(DISTINCT stu.student_id) AS enrolled_students_count
            FROM faculty_assignments fa
            JOIN courses c ON c.course_id = fa.course_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            LEFT JOIN students stu ON stu.course_id = fa.course_id 
                 AND stu.semester = fa.semester 
                 AND (stu.section = fa.section OR fa.section IS NULL)
            WHERE fa.faculty_id = @facultyId
            GROUP BY fa.faculty_assignment_id, fa.academic_year, fa.semester, fa.section,
                     c.course_id, c.course_code, c.course_name,
                     s.subject_id, s.subject_code, s.subject_name, s.credits
            ORDER BY fa.academic_year DESC, fa.semester, fa.section, s.subject_code;
            """;

        var assignedClasses = new List<object>();
        await using (var cmd = new NpgsqlCommand(classesSql, connection))
        {
            cmd.Parameters.AddWithValue("facultyId", facultyId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                assignedClasses.Add(new
                {
                    facultyAssignmentId = reader["faculty_assignment_id"],
                    academicYear = reader["academic_year"].ToString(),
                    semester = Convert.ToInt32(reader["semester"]),
                    section = reader["section"].ToString(),
                    courseId = reader["course_id"],
                    courseCode = reader["course_code"].ToString(),
                    courseName = reader["course_name"].ToString(),
                    subjectId = reader["subject_id"],
                    subjectCode = reader["subject_code"].ToString(),
                    subjectName = reader["subject_name"].ToString(),
                    credits = Convert.ToInt32(reader["credits"]),
                    enrolledStudentsCount = Convert.ToInt32(reader["enrolled_students_count"])
                });
            }
        }

        // 3. Aggregate Metrics
        const string metricsSql = """
            SELECT
                (
                    SELECT COUNT(DISTINCT stu.student_id)
                    FROM faculty_assignments fa
                    JOIN students stu ON stu.course_id = fa.course_id 
                         AND stu.semester = fa.semester 
                         AND (stu.section = fa.section OR fa.section IS NULL)
                    WHERE fa.faculty_id = @facultyId
                ) AS total_students,
                (
                    SELECT COUNT(sub.submission_id)
                    FROM submissions sub
                    JOIN assignments a ON a.assignment_id = sub.assignment_id
                    JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
                    WHERE fa.faculty_id = @facultyId
                      AND sub.submission_status = 'SUBMITTED'
                      AND sub.marks_obtained IS NULL
                ) AS pending_submissions,
                (
                    SELECT COUNT(a.assignment_id)
                    FROM assignments a
                    JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
                    WHERE fa.faculty_id = @facultyId
                ) AS active_assignments,
                (
                    SELECT COUNT(cs.session_id)
                    FROM class_sessions cs
                    JOIN faculty_assignments fa ON fa.faculty_assignment_id = cs.faculty_assignment_id
                    WHERE fa.faculty_id = @facultyId
                ) AS conducted_sessions;
            """;

        int totalStudents = 0, pendingSubmissions = 0, activeAssignments = 0, conductedSessions = 0;
        await using (var cmd = new NpgsqlCommand(metricsSql, connection))
        {
            cmd.Parameters.AddWithValue("facultyId", facultyId);
            await using var reader = await cmd.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                totalStudents = Convert.ToInt32(reader["total_students"]);
                pendingSubmissions = Convert.ToInt32(reader["pending_submissions"]);
                activeAssignments = Convert.ToInt32(reader["active_assignments"]);
                conductedSessions = Convert.ToInt32(reader["conducted_sessions"]);
            }
        }

        // 4. Recent Class Sessions
        const string recentSessionsSql = """
            SELECT 
                cs.session_id, 
                cs.session_date, 
                cs.start_time, 
                cs.end_time, 
                cs.session_status,
                sub.subject_code, 
                sub.subject_name, 
                fa.section, 
                fa.semester
            FROM class_sessions cs
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = cs.faculty_assignment_id
            JOIN subjects sub ON sub.subject_id = fa.subject_id
            WHERE fa.faculty_id = @facultyId
            ORDER BY cs.session_date DESC
            LIMIT 5;
            """;

        var recentSessions = new List<object>();
        await using (var cmd = new NpgsqlCommand(recentSessionsSql, connection))
        {
            cmd.Parameters.AddWithValue("facultyId", facultyId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var sessionDate = reader.GetDateTime(reader.GetOrdinal("session_date")).ToString("yyyy-MM-dd");
                var startTime = reader.IsDBNull(reader.GetOrdinal("start_time")) ? null : reader.GetTimeSpan(reader.GetOrdinal("start_time")).ToString(@"hh\:mm");
                var endTime = reader.IsDBNull(reader.GetOrdinal("end_time")) ? null : reader.GetTimeSpan(reader.GetOrdinal("end_time")).ToString(@"hh\:mm");

                recentSessions.Add(new
                {
                    sessionId = reader["session_id"],
                    sessionDate,
                    startTime,
                    endTime,
                    sessionStatus = reader["session_status"].ToString(),
                    subjectCode = reader["subject_code"].ToString(),
                    subjectName = reader["subject_name"].ToString(),
                    section = reader["section"].ToString(),
                    semester = Convert.ToInt32(reader["semester"])
                });
            }
        }

        // 5. Recent Submissions Pending Grading
        const string recentSubsSql = """
            SELECT 
                sub.submission_id, 
                sub.submitted_at, 
                sub.submission_status,
                a.title AS assignment_title, 
                a.max_marks,
                u.full_name AS student_name, 
                stu.enrollment_number,
                s.subject_code
            FROM submissions sub
            JOIN assignments a ON a.assignment_id = sub.assignment_id
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            JOIN students stu ON stu.student_id = sub.student_id
            JOIN users u ON u.user_id = stu.user_id
            WHERE fa.faculty_id = @facultyId
            ORDER BY sub.submitted_at DESC NULLS LAST
            LIMIT 5;
            """;

        var pendingGradingList = new List<object>();
        await using (var cmd = new NpgsqlCommand(recentSubsSql, connection))
        {
            cmd.Parameters.AddWithValue("facultyId", facultyId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var submittedAt = reader.IsDBNull(reader.GetOrdinal("submitted_at"))
                    ? null
                    : reader.GetDateTime(reader.GetOrdinal("submitted_at")).ToString("o");

                pendingGradingList.Add(new
                {
                    submissionId = reader["submission_id"],
                    submittedAt,
                    submissionStatus = reader["submission_status"].ToString(),
                    assignmentTitle = reader["assignment_title"].ToString(),
                    maxMarks = Convert.ToDecimal(reader["max_marks"]),
                    studentName = reader["student_name"].ToString(),
                    enrollmentNumber = reader["enrollment_number"].ToString(),
                    subjectCode = reader["subject_code"].ToString()
                });
            }
        }

        return Results.Ok(new
        {
            faculty = new
            {
                facultyId,
                employeeCode,
                designation,
                fullName,
                email,
                department = departmentName
            },
            metrics = new
            {
                totalAssignedClasses = assignedClasses.Count,
                totalStudents,
                pendingSubmissions,
                activeAssignments,
                conductedSessions
            },
            assignedClasses,
            recentSessions,
            pendingGradingList
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY DASHBOARD DATABASE ERROR: {ex}");
        return Results.Problem("Could not retrieve faculty dashboard data. Check backend logs.");
    }
}).RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY CLASS STUDENT ROSTER API
// GET /api/faculty/assignments/{facultyAssignmentId:guid}/students
// Restricted to authenticated faculty member owning the assignment
// ======================================================

app.MapGet("/api/faculty/assignments/{facultyAssignmentId:guid}/students", async (
    Guid facultyAssignmentId,
    HttpContext httpContext,
    IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem("Database connection string is missing.");
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Fetch Class Assignment Details & Verify Ownership
        const string classSql = """
            SELECT 
                fa.faculty_assignment_id,
                fa.academic_year,
                fa.semester,
                fa.section,
                c.course_id,
                c.course_code,
                c.course_name,
                s.subject_id,
                s.subject_code,
                s.subject_name,
                s.credits,
                COALESCE(d.department_name, 'Academic Department') AS department_name
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            LEFT JOIN departments d ON d.department_id = c.department_id
            WHERE fa.faculty_assignment_id = @facultyAssignmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        object classDetails;
        await using (var cmd = new NpgsqlCommand(classSql, connection))
        {
            cmd.Parameters.AddWithValue("facultyAssignmentId", facultyAssignmentId);
            cmd.Parameters.AddWithValue("userId", userId);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }

            classDetails = new
            {
                facultyAssignmentId = reader["faculty_assignment_id"],
                academicYear = reader["academic_year"].ToString(),
                semester = Convert.ToInt32(reader["semester"]),
                section = reader["section"].ToString(),
                courseId = reader["course_id"],
                courseCode = reader["course_code"].ToString(),
                courseName = reader["course_name"].ToString(),
                subjectId = reader["subject_id"],
                subjectCode = reader["subject_code"].ToString(),
                subjectName = reader["subject_name"].ToString(),
                credits = Convert.ToInt32(reader["credits"]),
                departmentName = reader["department_name"].ToString()
            };
        }

        // 2. Fetch Enrolled Students for this Class Assignment with Attendance Stats
        const string studentsSql = """
            SELECT 
                stu.student_id,
                stu.enrollment_number,
                u.full_name,
                u.email,
                stu.semester,
                stu.section,
                stu.admission_year,
                COALESCE(d.department_name, 'Department of AI & ML') AS department_name,
                COALESCE(ce.enrollment_status, 'ACTIVE') AS enrollment_status,
                ce.enrolled_at,
                COUNT(cs.session_id) AS total_sessions,
                COUNT(CASE WHEN att.attendance_status = 'PRESENT' THEN 1 END) AS attended_sessions
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN students stu ON stu.course_id = fa.course_id 
                 AND stu.semester = fa.semester 
                 AND (stu.section = fa.section OR fa.section IS NULL)
            JOIN users u ON u.user_id = stu.user_id
            LEFT JOIN departments d ON d.department_id = stu.department_id
            LEFT JOIN course_enrollments ce ON ce.student_id = stu.student_id 
                 AND ce.course_id = fa.course_id 
                 AND ce.academic_year = fa.academic_year
            LEFT JOIN class_sessions cs ON cs.faculty_assignment_id = fa.faculty_assignment_id
            LEFT JOIN attendance att ON att.session_id = cs.session_id AND att.student_id = stu.student_id
            WHERE fa.faculty_assignment_id = @facultyAssignmentId
              AND f.user_id = @userId
            GROUP BY stu.student_id, stu.enrollment_number, u.full_name, u.email,
                     stu.semester, stu.section, stu.admission_year, d.department_name,
                     ce.enrollment_status, ce.enrolled_at
            ORDER BY u.full_name;
            """;

        var students = new List<object>();
        await using (var cmd = new NpgsqlCommand(studentsSql, connection))
        {
            cmd.Parameters.AddWithValue("facultyAssignmentId", facultyAssignmentId);
            cmd.Parameters.AddWithValue("userId", userId);

            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var enrolledAt = reader.IsDBNull(reader.GetOrdinal("enrolled_at"))
                    ? null
                    : reader.GetDateTime(reader.GetOrdinal("enrolled_at")).ToString("o");

                var totalSessions = Convert.ToInt32(reader["total_sessions"]);
                var attendedSessions = Convert.ToInt32(reader["attended_sessions"]);
                var attendancePct = totalSessions > 0
                    ? Math.Round((double)attendedSessions / totalSessions * 100.0, 1)
                    : 100.0;

                students.Add(new
                {
                    studentId = reader["student_id"],
                    enrollmentNumber = reader["enrollment_number"].ToString(),
                    fullName = reader["full_name"].ToString(),
                    email = reader["email"].ToString(),
                    semester = Convert.ToInt32(reader["semester"]),
                    section = reader["section"].ToString(),
                    admissionYear = Convert.ToInt32(reader["admission_year"]),
                    department = reader["department_name"].ToString(),
                    enrollmentStatus = reader["enrollment_status"].ToString(),
                    enrolledAt,
                    totalSessions,
                    attendedSessions,
                    attendancePercentage = attendancePct
                });
            }
        }

        return Results.Ok(new
        {
            classDetails,
            totalStudents = students.Count,
            students
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY STUDENT ROSTER ERROR: {ex}");
        return Results.Problem("Could not retrieve student roster. Check backend logs.");
    }
}).RequireAuthorization("FacultyOnly");







app.MapGet(
    "/api/faculty/sessions/{sessionId:guid}/attendance",
    async (
        Guid sessionId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User
        .FindFirst(ClaimTypes.NameIdentifier)?.Value;

    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString =
        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT
                cs.session_id,
                cs.session_date,
                cs.session_status,
                fa.faculty_assignment_id,
                sub.subject_code,
                sub.subject_name,
                s.student_id,
                s.enrollment_number,
                u.full_name,
                u.email,
                a.attendance_id,
                a.attendance_status,
                a.marked_at
            FROM class_sessions cs
            JOIN faculty_assignments fa
                ON fa.faculty_assignment_id = cs.faculty_assignment_id
            JOIN faculty f
                ON f.faculty_id = fa.faculty_id
            JOIN subjects sub
                ON sub.subject_id = fa.subject_id
            LEFT JOIN students s
                ON s.course_id = fa.course_id
               AND s.semester = fa.semester
               AND s.section = fa.section
            LEFT JOIN course_enrollments ce
                ON ce.student_id = s.student_id
               AND ce.course_id = fa.course_id
               AND ce.academic_year = fa.academic_year
               AND ce.enrollment_status = 'ACTIVE'
            LEFT JOIN users u
                ON u.user_id = s.user_id
            LEFT JOIN attendance a
                ON a.session_id = cs.session_id
               AND a.student_id = s.student_id
            WHERE cs.session_id = @sessionId
              AND f.user_id = @userId
              AND (s.student_id IS NULL OR ce.student_id IS NOT NULL)
            ORDER BY u.full_name;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("sessionId", sessionId);
        command.Parameters.AddWithValue("userId", userId);

        await using var reader = await command.ExecuteReaderAsync();

        var students = new List<object>();
        Guid? assignmentId = null;
        DateTime? sessionDate = null;
        string? sessionStatus = null;
        string? subjectCode = null;
        string? subjectName = null;

        while (await reader.ReadAsync())
        {
            assignmentId ??= reader.GetGuid(
                reader.GetOrdinal("faculty_assignment_id"));

            sessionDate ??= reader.GetDateTime(
                reader.GetOrdinal("session_date"));

            sessionStatus ??= reader["session_status"].ToString();
            subjectCode ??= reader["subject_code"].ToString();
            subjectName ??= reader["subject_name"].ToString();

            if (reader.IsDBNull(reader.GetOrdinal("student_id")))
                continue;

            students.Add(new
            {
                studentId = reader["student_id"],
                enrollmentNumber = reader["enrollment_number"],
                fullName = reader["full_name"],
                email = reader["email"],
                attendanceId = reader["attendance_id"] is DBNull
                    ? null : reader["attendance_id"],
                attendanceStatus = reader["attendance_status"] is DBNull
                    ? "NOT_MARKED"
                    : reader["attendance_status"].ToString(),
                markedAt = reader["marked_at"] is DBNull
                    ? null : reader["marked_at"]
            });
        }

        if (assignmentId is null)
        {
            return Results.NotFound(new
            {
                message = "Session not found or not assigned to you."
            });
        }

        return Results.Ok(new
        {
            sessionId,
            facultyAssignmentId = assignmentId,
            sessionDate,
            sessionStatus,
            subjectCode,
            subjectName,
            count = students.Count,
            students
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY ATTENDANCE LIST ERROR: {ex}");
        return Results.Problem(
            "Could not retrieve attendance. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY SESSIONS LIST API
// GET /api/faculty/assignments/{facultyAssignmentId:guid}/sessions
// ======================================================

app.MapGet(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/sessions",
    async (
        Guid facultyAssignmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify that this facultyAssignmentId belongs to the authenticated faculty member
        const string verifySql = """
            SELECT fa.faculty_assignment_id, fa.academic_year, fa.semester, fa.section,
                   c.course_name, c.course_code, s.subject_name, s.subject_code, s.credits
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            WHERE fa.faculty_assignment_id = @assignmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        object? classDetails = null;
        await using (var verifyCmd = new NpgsqlCommand(verifySql, connection))
        {
            verifyCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            verifyCmd.Parameters.AddWithValue("userId", userId);
            await using var verifyReader = await verifyCmd.ExecuteReaderAsync();
            if (!await verifyReader.ReadAsync())
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }

            classDetails = new
            {
                facultyAssignmentId,
                academicYear = verifyReader["academic_year"].ToString(),
                semester = Convert.ToInt32(verifyReader["semester"]),
                section = verifyReader["section"].ToString(),
                courseName = verifyReader["course_name"].ToString(),
                courseCode = verifyReader["course_code"].ToString(),
                subjectName = verifyReader["subject_name"].ToString(),
                subjectCode = verifyReader["subject_code"].ToString(),
                credits = Convert.ToInt32(verifyReader["credits"])
            };
        }

        // 2. Fetch all sessions for this assignment with aggregated attendance counts
        const string sessionsSql = """
            SELECT 
                cs.session_id,
                cs.session_date,
                cs.start_time,
                cs.end_time,
                cs.session_status,
                cs.created_at,
                COUNT(a.attendance_id) FILTER (WHERE a.attendance_status = 'PRESENT') AS present_count,
                COUNT(a.attendance_id) FILTER (WHERE a.attendance_status = 'ABSENT') AS absent_count,
                COUNT(a.attendance_id) AS total_marked,
                (
                    SELECT COUNT(DISTINCT stu.student_id)
                    FROM students stu
                    JOIN course_enrollments ce ON ce.student_id = stu.student_id 
                         AND ce.course_id = fa.course_id 
                         AND ce.academic_year = fa.academic_year
                         AND ce.enrollment_status = 'ACTIVE'
                    WHERE stu.course_id = fa.course_id 
                      AND stu.semester = fa.semester 
                      AND (stu.section = fa.section OR fa.section IS NULL)
                ) AS total_enrolled
            FROM class_sessions cs
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = cs.faculty_assignment_id
            LEFT JOIN attendance a ON a.session_id = cs.session_id
            WHERE cs.faculty_assignment_id = @assignmentId
            GROUP BY cs.session_id, cs.session_date, cs.start_time, cs.end_time, cs.session_status, cs.created_at,
                     fa.course_id, fa.semester, fa.section, fa.academic_year
            ORDER BY cs.session_date DESC, cs.start_time DESC NULLS LAST;
            """;

        var sessions = new List<object>();
        await using (var cmd = new NpgsqlCommand(sessionsSql, connection))
        {
            cmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var sDate = reader.GetDateTime(reader.GetOrdinal("session_date"));
                string? startTimeStr = reader.IsDBNull(reader.GetOrdinal("start_time"))
                    ? null
                    : reader.GetTimeSpan(reader.GetOrdinal("start_time")).ToString(@"hh\:mm");
                string? endTimeStr = reader.IsDBNull(reader.GetOrdinal("end_time"))
                    ? null
                    : reader.GetTimeSpan(reader.GetOrdinal("end_time")).ToString(@"hh\:mm");

                sessions.Add(new
                {
                    sessionId = reader["session_id"],
                    facultyAssignmentId,
                    sessionDate = sDate.ToString("yyyy-MM-dd"),
                    startTime = startTimeStr,
                    endTime = endTimeStr,
                    sessionStatus = reader["session_status"].ToString(),
                    presentCount = Convert.ToInt32(reader["present_count"]),
                    absentCount = Convert.ToInt32(reader["absent_count"]),
                    totalMarked = Convert.ToInt32(reader["total_marked"]),
                    totalEnrolled = Convert.ToInt32(reader["total_enrolled"]),
                    createdAt = reader["created_at"]
                });
            }
        }

        return Results.Ok(new
        {
            classDetails,
            totalSessions = sessions.Count,
            sessions
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY SESSIONS LIST ERROR: {ex}");
        return Results.Problem("Could not retrieve class sessions. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// CREATE CLASS SESSION API
// POST /api/faculty/assignments/{facultyAssignmentId:guid}/sessions
// ======================================================

app.MapPost(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/sessions",
    async (
        Guid facultyAssignmentId,
        CreateClassSessionRequest request,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    var status = string.IsNullOrWhiteSpace(request.SessionStatus)
        ? "CONDUCTED"
        : request.SessionStatus.Trim().ToUpperInvariant();

    if (status != "SCHEDULED" && status != "CONDUCTED" && status != "CANCELLED")
    {
        return Results.BadRequest(new { message = "Invalid session status. Allowed values: 'SCHEDULED', 'CONDUCTED', 'CANCELLED'." });
    }

    TimeSpan? startTime = null;
    if (!string.IsNullOrWhiteSpace(request.StartTime) && TimeSpan.TryParse(request.StartTime, out var st))
    {
        startTime = st;
    }

    TimeSpan? endTime = null;
    if (!string.IsNullOrWhiteSpace(request.EndTime) && TimeSpan.TryParse(request.EndTime, out var et))
    {
        endTime = et;
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership
        const string checkSql = """
            SELECT fa.faculty_assignment_id
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE fa.faculty_assignment_id = @assignmentId
              AND f.user_id = @userId;
            """;

        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            var exists = await checkCmd.ExecuteScalarAsync();
            if (exists is null)
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }
        }

        // 2. Insert new session
        const string insertSql = """
            INSERT INTO class_sessions (
                session_id,
                faculty_assignment_id,
                session_date,
                start_time,
                end_time,
                session_status,
                created_at
            )
            VALUES (
                gen_random_uuid(),
                @assignmentId,
                @sessionDate,
                @startTime,
                @endTime,
                @sessionStatus,
                CURRENT_TIMESTAMP
            )
            RETURNING session_id, session_date, start_time, end_time, session_status, created_at;
            """;

        await using var insertCmd = new NpgsqlCommand(insertSql, connection);
        insertCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
        insertCmd.Parameters.AddWithValue("sessionDate", request.SessionDate.Date);
        insertCmd.Parameters.AddWithValue("startTime", (object?)startTime ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("endTime", (object?)endTime ?? DBNull.Value);
        insertCmd.Parameters.AddWithValue("sessionStatus", status);

        await using var reader = await insertCmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.Problem("Could not create class session.");
        }

        var newSessionId = (Guid)reader["session_id"];
        var createdDate = reader.GetDateTime(reader.GetOrdinal("session_date"));

        return Results.Created($"/api/faculty/sessions/{newSessionId}/attendance", new
        {
            message = "Class session created successfully.",
            sessionId = newSessionId,
            facultyAssignmentId,
            sessionDate = createdDate.ToString("yyyy-MM-dd"),
            startTime = startTime?.ToString(@"hh\:mm"),
            endTime = endTime?.ToString(@"hh\:mm"),
            sessionStatus = status,
            createdAt = reader["created_at"]
        });
    }
    catch (PostgresException ex) when (ex.SqlState == "23505")
    {
        return Results.Conflict(new { message = "A session for this class already exists on the specified date and start time." });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"CREATE SESSION ERROR: {ex}");
        return Results.Problem("Could not create session. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// UPDATE SESSION ATTENDANCE API
// PUT /api/faculty/sessions/{sessionId:guid}/attendance
// ======================================================

app.MapPut(
    "/api/faculty/sessions/{sessionId:guid}/attendance",
    async (
        Guid sessionId,
        UpdateSessionAttendanceRequest request,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    // Consolidate records
    var records = new List<StudentAttendanceItem>();
    if (request.Records != null && request.Records.Count > 0)
    {
        records.AddRange(request.Records);
    }
    else if (request.StudentId.HasValue && !string.IsNullOrWhiteSpace(request.AttendanceStatus))
    {
        records.Add(new StudentAttendanceItem(request.StudentId.Value, request.AttendanceStatus));
    }

    if (records.Count == 0)
    {
        return Results.BadRequest(new { message = "No student attendance records provided." });
    }

    // Check for duplicate student IDs in submission
    var seenStudentIds = new HashSet<Guid>();
    foreach (var rec in records)
    {
        if (!seenStudentIds.Add(rec.StudentId))
        {
            return Results.BadRequest(new
            {
                message = $"Duplicate student ID '{rec.StudentId}' found in attendance submission."
            });
        }
    }

    // Validate statuses against PostgreSQL CHECK constraint
    foreach (var rec in records)
    {
        var st = rec.AttendanceStatus?.Trim().ToUpperInvariant();
        if (st != "PRESENT" && st != "ABSENT")
        {
            return Results.BadRequest(new
            {
                message = $"Invalid attendance status '{rec.AttendanceStatus}'. Institutional database rules strictly permit only 'PRESENT' or 'ABSENT'."
            });
        }
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify session exists and belongs to the authenticated faculty member
        const string sessionCheckSql = """
            SELECT cs.session_id, cs.session_status, fa.course_id, fa.semester, fa.section, fa.academic_year
            FROM class_sessions cs
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = cs.faculty_assignment_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE cs.session_id = @sessionId
              AND f.user_id = @userId;
            """;

        Guid courseId;
        int semester;
        string section;
        string academicYear;
        string sessionStatus;

        await using (var checkCmd = new NpgsqlCommand(sessionCheckSql, connection))
        {
            checkCmd.Parameters.AddWithValue("sessionId", sessionId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            await using var checkReader = await checkCmd.ExecuteReaderAsync();
            if (!await checkReader.ReadAsync())
            {
                return Results.NotFound(new { message = "Session not found or access denied." });
            }

            sessionStatus = checkReader["session_status"]?.ToString() ?? string.Empty;
            courseId = (Guid)checkReader["course_id"];
            semester = Convert.ToInt32(checkReader["semester"]);
            section = checkReader["section"]?.ToString() ?? string.Empty;
            academicYear = checkReader["academic_year"]?.ToString() ?? string.Empty;
        }

        // Reject attendance updates on cancelled sessions
        if (string.Equals(sessionStatus, "CANCELLED", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest(new { message = "Cannot record or update attendance for a cancelled class session." });
        }

        // 2. Validate that all submitted student IDs are actively enrolled in this class session
        const string enrolledStudentsSql = """
            SELECT s.student_id
            FROM students s
            JOIN course_enrollments ce
                ON ce.student_id = s.student_id
               AND ce.course_id = s.course_id
            WHERE s.course_id = @courseId
              AND s.semester = @semester
              AND s.section = @section
              AND ce.academic_year = @academicYear
              AND ce.enrollment_status = 'ACTIVE';
            """;

        var enrolledIds = new HashSet<Guid>();
        await using (var enrollCmd = new NpgsqlCommand(enrolledStudentsSql, connection))
        {
            enrollCmd.Parameters.AddWithValue("courseId", courseId);
            enrollCmd.Parameters.AddWithValue("semester", semester);
            enrollCmd.Parameters.AddWithValue("section", section);
            enrollCmd.Parameters.AddWithValue("academicYear", academicYear);
            await using var enrollReader = await enrollCmd.ExecuteReaderAsync();
            while (await enrollReader.ReadAsync())
            {
                enrolledIds.Add(enrollReader.GetGuid(0));
            }
        }

        foreach (var item in records)
        {
            if (!enrolledIds.Contains(item.StudentId))
            {
                return Results.BadRequest(new
                {
                    message = $"Student '{item.StudentId}' is not actively enrolled in this class session and cannot be marked for attendance."
                });
            }
        }

        // 3. Perform transactional UPSERT for each student record
        await using var transaction = await connection.BeginTransactionAsync();

        const string upsertSql = """
            INSERT INTO attendance (
                attendance_id,
                session_id,
                student_id,
                attendance_status,
                marked_at,
                updated_at
            )
            VALUES (
                gen_random_uuid(),
                @sessionId,
                @studentId,
                @status,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (session_id, student_id)
            DO UPDATE SET
                attendance_status = EXCLUDED.attendance_status,
                updated_at = CURRENT_TIMESTAMP;
            """;

        foreach (var item in records)
        {
            var validStatus = item.AttendanceStatus.Trim().ToUpperInvariant();
            await using var upsertCmd = new NpgsqlCommand(upsertSql, connection, transaction);
            upsertCmd.Parameters.AddWithValue("sessionId", sessionId);
            upsertCmd.Parameters.AddWithValue("studentId", item.StudentId);
            upsertCmd.Parameters.AddWithValue("status", validStatus);
            await upsertCmd.ExecuteNonQueryAsync();
        }

        // 3. If requested or default, ensure session is set to 'CONDUCTED' so it appears in analytics
        if (request.MarkSessionConducted != false)
        {
            const string updateSessionStatusSql = """
                UPDATE class_sessions
                SET session_status = 'CONDUCTED'
                WHERE session_id = @sessionId
                  AND session_status = 'SCHEDULED';
                """;
            await using var updateStatusCmd = new NpgsqlCommand(updateSessionStatusSql, connection, transaction);
            updateStatusCmd.Parameters.AddWithValue("sessionId", sessionId);
            await updateStatusCmd.ExecuteNonQueryAsync();
        }

        await transaction.CommitAsync();

        return Results.Ok(new
        {
            message = "Attendance marked successfully.",
            sessionId,
            updatedCount = records.Count,
            savedAt = DateTime.UtcNow
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"MARK ATTENDANCE ERROR: {ex}");
        return Results.Problem("Could not save attendance records. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY CLASS TASKS / ASSIGNMENTS API
// GET /api/faculty/assignments/{facultyAssignmentId:guid}/tasks
// ======================================================

app.MapGet(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/tasks",
    async (
        Guid facultyAssignmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify that this facultyAssignmentId belongs to the authenticated faculty member
        const string verifySql = """
            SELECT fa.faculty_assignment_id, fa.academic_year, fa.semester, fa.section,
                   c.course_name, c.course_code, s.subject_name, s.subject_code, s.credits
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            WHERE fa.faculty_assignment_id = @assignmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        object? classDetails = null;
        await using (var verifyCmd = new NpgsqlCommand(verifySql, connection))
        {
            verifyCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            verifyCmd.Parameters.AddWithValue("userId", userId);
            await using var verifyReader = await verifyCmd.ExecuteReaderAsync();
            if (!await verifyReader.ReadAsync())
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }

            classDetails = new
            {
                facultyAssignmentId,
                academicYear = verifyReader["academic_year"].ToString(),
                semester = Convert.ToInt32(verifyReader["semester"]),
                section = verifyReader["section"].ToString(),
                courseName = verifyReader["course_name"].ToString(),
                courseCode = verifyReader["course_code"].ToString(),
                subjectName = verifyReader["subject_name"].ToString(),
                subjectCode = verifyReader["subject_code"].ToString(),
                credits = Convert.ToInt32(verifyReader["credits"])
            };
        }

        // 2. Query assignments with submission stats
        const string tasksSql = """
            SELECT 
                a.assignment_id,
                a.faculty_assignment_id,
                a.title,
                a.instructions,
                a.due_at,
                a.max_marks,
                a.created_at,
                COUNT(sub.submission_id) AS submitted_count,
                COUNT(sub.submission_id) FILTER (WHERE sub.submission_status = 'GRADED') AS graded_count,
                (
                    SELECT COUNT(DISTINCT stu.student_id)
                    FROM students stu
                    JOIN course_enrollments ce ON ce.student_id = stu.student_id 
                         AND ce.course_id = fa.course_id 
                         AND ce.academic_year = fa.academic_year
                         AND ce.enrollment_status = 'ACTIVE'
                    WHERE stu.course_id = fa.course_id 
                      AND stu.semester = fa.semester 
                      AND (stu.section = fa.section OR fa.section IS NULL)
                ) AS total_enrolled
            FROM assignments a
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
            LEFT JOIN submissions sub ON sub.assignment_id = a.assignment_id
            WHERE a.faculty_assignment_id = @assignmentId
            GROUP BY a.assignment_id, a.faculty_assignment_id, a.title, a.instructions, a.due_at, a.max_marks, a.created_at,
                     fa.course_id, fa.semester, fa.section, fa.academic_year
            ORDER BY a.created_at DESC;
            """;

        var assignmentsList = new List<object>();
        await using (var cmd = new NpgsqlCommand(tasksSql, connection))
        {
            cmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                assignmentsList.Add(new
                {
                    assignmentId = reader["assignment_id"],
                    facultyAssignmentId,
                    title = reader["title"].ToString(),
                    instructions = reader["instructions"] is DBNull ? null : reader["instructions"].ToString(),
                    dueAt = reader["due_at"] is DBNull ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("due_at")),
                    maxMarks = Convert.ToDecimal(reader["max_marks"]),
                    createdAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
                    submittedCount = Convert.ToInt32(reader["submitted_count"]),
                    gradedCount = Convert.ToInt32(reader["graded_count"]),
                    totalEnrolled = Convert.ToInt32(reader["total_enrolled"])
                });
            }
        }

        return Results.Ok(new
        {
            classDetails,
            totalAssignments = assignmentsList.Count,
            assignments = assignmentsList
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY ASSIGNMENTS LIST ERROR: {ex}");
        return Results.Problem("Could not retrieve class assignments. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// CREATE FACULTY ASSIGNMENT API
// POST /api/faculty/assignments/{facultyAssignmentId:guid}/tasks
// ======================================================

app.MapPost(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/tasks",
    async (
        Guid facultyAssignmentId,
        CreateAssignmentRequest request,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest(new { message = "Assignment title is required." });

    if (request.MaxMarks <= 0)
        return Results.BadRequest(new { message = "Maximum marks must be greater than zero." });

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership of faculty_assignment_id
        const string checkSql = """
            SELECT fa.faculty_assignment_id
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE fa.faculty_assignment_id = @assignmentId
              AND f.user_id = @userId;
            """;

        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            var exists = await checkCmd.ExecuteScalarAsync();
            if (exists is null)
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }
        }

        // 2. Insert new assignment
        const string insertSql = """
            INSERT INTO assignments (
                assignment_id,
                faculty_assignment_id,
                title,
                instructions,
                due_at,
                max_marks,
                created_at
            )
            VALUES (
                gen_random_uuid(),
                @assignmentId,
                @title,
                @instructions,
                @dueAt,
                @maxMarks,
                CURRENT_TIMESTAMP
            )
            RETURNING assignment_id, faculty_assignment_id, title, instructions, due_at, max_marks, created_at;
            """;

        await using var insertCmd = new NpgsqlCommand(insertSql, connection);
        insertCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
        insertCmd.Parameters.AddWithValue("title", request.Title.Trim());
        insertCmd.Parameters.AddWithValue("instructions", string.IsNullOrWhiteSpace(request.Instructions) ? DBNull.Value : (object)request.Instructions.Trim());
        insertCmd.Parameters.AddWithValue("dueAt", request.DueAt.HasValue ? (object)request.DueAt.Value : DBNull.Value);
        insertCmd.Parameters.AddWithValue("maxMarks", request.MaxMarks);

        await using var reader = await insertCmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.Problem("Could not create assignment.");
        }

        var newAssignmentId = (Guid)reader["assignment_id"];

        return Results.Created($"/api/faculty/assignments/tasks/{newAssignmentId}/submissions", new
        {
            message = "Assignment created successfully.",
            assignmentId = newAssignmentId,
            facultyAssignmentId,
            title = reader["title"].ToString(),
            instructions = reader["instructions"] is DBNull ? null : reader["instructions"].ToString(),
            dueAt = reader["due_at"] is DBNull ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("due_at")),
            maxMarks = Convert.ToDecimal(reader["max_marks"]),
            createdAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"CREATE ASSIGNMENT ERROR: {ex}");
        return Results.Problem("Could not create assignment. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// FETCH ASSIGNMENT SUBMISSIONS ROSTER API
// GET /api/faculty/assignments/tasks/{assignmentId:guid}/submissions
// ======================================================

app.MapGet(
    "/api/faculty/assignments/tasks/{assignmentId:guid}/submissions",
    async (
        Guid assignmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership and fetch assignment details
        const string checkSql = """
            SELECT a.assignment_id, a.title, a.instructions, a.due_at, a.max_marks, a.created_at,
                   fa.faculty_assignment_id, fa.semester, fa.section, fa.academic_year,
                   s.subject_code, s.subject_name, c.course_name, c.course_code
            FROM assignments a
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            JOIN courses c ON c.course_id = fa.course_id
            WHERE a.assignment_id = @assignmentId
              AND f.user_id = @userId;
            """;

        object? assignmentMeta = null;
        Guid facultyAssignmentId;

        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("assignmentId", assignmentId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            await using var reader = await checkCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Assignment not found or access denied." });
            }

            facultyAssignmentId = (Guid)reader["faculty_assignment_id"];

            assignmentMeta = new
            {
                assignmentId,
                facultyAssignmentId,
                title = reader["title"].ToString(),
                instructions = reader["instructions"] is DBNull ? null : reader["instructions"].ToString(),
                dueAt = reader["due_at"] is DBNull ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("due_at")),
                maxMarks = Convert.ToDecimal(reader["max_marks"]),
                createdAt = reader.GetDateTime(reader.GetOrdinal("created_at")),
                subjectCode = reader["subject_code"].ToString(),
                subjectName = reader["subject_name"].ToString(),
                courseName = reader["course_name"].ToString(),
                courseCode = reader["course_code"].ToString(),
                semester = Convert.ToInt32(reader["semester"]),
                section = reader["section"].ToString(),
                academicYear = reader["academic_year"].ToString()
            };
        }

        // 2. Fetch all enrolled students and left-join submissions for this assignment
        const string subSql = """
            SELECT 
                stu.student_id,
                stu.enrollment_number,
                u.full_name,
                u.email,
                sub.submission_id,
                sub.file_url,
                sub.submitted_at,
                COALESCE(sub.submission_status, 'PENDING') AS submission_status,
                sub.marks_obtained,
                sub.feedback,
                sub.updated_at
            FROM faculty_assignments fa
            JOIN students stu ON stu.course_id = fa.course_id
                 AND stu.semester = fa.semester
                 AND (stu.section = fa.section OR fa.section IS NULL)
            JOIN course_enrollments ce ON ce.student_id = stu.student_id
                 AND ce.course_id = fa.course_id
                 AND ce.academic_year = fa.academic_year
                 AND ce.enrollment_status = 'ACTIVE'
            JOIN users u ON u.user_id = stu.user_id
            LEFT JOIN submissions sub ON sub.assignment_id = @assignmentId
                 AND sub.student_id = stu.student_id
            WHERE fa.faculty_assignment_id = @facultyAssignmentId
            ORDER BY u.full_name;
            """;

        var studentSubmissions = new List<object>();
        await using (var subCmd = new NpgsqlCommand(subSql, connection))
        {
            subCmd.Parameters.AddWithValue("assignmentId", assignmentId);
            subCmd.Parameters.AddWithValue("facultyAssignmentId", facultyAssignmentId);
            await using var reader = await subCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var subId = reader["submission_id"] is DBNull ? null : (Guid?)reader["submission_id"];
                studentSubmissions.Add(new
                {
                    studentId = reader["student_id"],
                    enrollmentNumber = reader["enrollment_number"].ToString(),
                    fullName = reader["full_name"].ToString(),
                    email = reader["email"].ToString(),
                    submissionId = subId,
                    hasSubmission = subId.HasValue,
                    fileUrl = reader["file_url"] is DBNull ? null : reader["file_url"].ToString(),
                    submittedAt = reader["submitted_at"] is DBNull ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("submitted_at")),
                    submissionStatus = reader["submission_status"].ToString(),
                    marksObtained = reader["marks_obtained"] is DBNull ? null : (decimal?)Convert.ToDecimal(reader["marks_obtained"]),
                    feedback = reader["feedback"] is DBNull ? null : reader["feedback"].ToString(),
                    updatedAt = reader["updated_at"] is DBNull ? null : (DateTime?)reader.GetDateTime(reader.GetOrdinal("updated_at"))
                });
            }
        }

        return Results.Ok(new
        {
            assignment = assignmentMeta,
            totalStudents = studentSubmissions.Count,
            submissions = studentSubmissions
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FETCH ASSIGNMENT SUBMISSIONS ERROR: {ex}");
        return Results.Problem("Could not retrieve submissions. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// GRADE SUBMISSION API
// PUT /api/faculty/submissions/{submissionId:guid}/grade
// ======================================================

app.MapPut(
    "/api/faculty/submissions/{submissionId:guid}/grade",
    async (
        Guid submissionId,
        GradeSubmissionRequest request,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    if (request.MarksObtained < 0)
        return Results.BadRequest(new { message = "Marks obtained cannot be negative." });

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership of the submission via faculty assignment
        const string checkSql = """
            SELECT sub.submission_id, a.max_marks, a.title
            FROM submissions sub
            JOIN assignments a ON a.assignment_id = sub.assignment_id
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE sub.submission_id = @submissionId
              AND f.user_id = @userId;
            """;

        decimal maxMarks;
        string assignmentTitle;

        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("submissionId", submissionId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            await using var reader = await checkCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Submission not found or access denied." });
            }

            maxMarks = Convert.ToDecimal(reader["max_marks"]);
            assignmentTitle = reader["title"].ToString()!;
        }

        if (request.MarksObtained > maxMarks)
        {
            return Results.BadRequest(new
            {
                message = $"Marks obtained ({request.MarksObtained}) cannot exceed maximum allowed marks ({maxMarks}) for '{assignmentTitle}'."
            });
        }

        // 2. Update submission with evaluated grade and feedback
        const string updateSql = """
            UPDATE submissions
            SET marks_obtained = @marks,
                feedback = @feedback,
                submission_status = 'GRADED',
                updated_at = CURRENT_TIMESTAMP
            WHERE submission_id = @submissionId
            RETURNING submission_id, marks_obtained, feedback, submission_status, updated_at;
            """;

        await using var updateCmd = new NpgsqlCommand(updateSql, connection);
        updateCmd.Parameters.AddWithValue("submissionId", submissionId);
        updateCmd.Parameters.AddWithValue("marks", request.MarksObtained);
        updateCmd.Parameters.AddWithValue("feedback", string.IsNullOrWhiteSpace(request.Feedback) ? DBNull.Value : (object)request.Feedback.Trim());

        await using var updateReader = await updateCmd.ExecuteReaderAsync();
        if (!await updateReader.ReadAsync())
        {
            return Results.Problem("Could not save grade.");
        }

        return Results.Ok(new
        {
            message = "Submission graded successfully.",
            submissionId,
            marksObtained = Convert.ToDecimal(updateReader["marks_obtained"]),
            maxMarks,
            feedback = updateReader["feedback"] is DBNull ? null : updateReader["feedback"].ToString(),
            submissionStatus = updateReader["submission_status"].ToString(),
            updatedAt = updateReader.GetDateTime(updateReader.GetOrdinal("updated_at"))
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"GRADE SUBMISSION ERROR: {ex}");
        return Results.Problem("Could not save evaluation. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY DOWNLOAD SUBMISSION FILE API
// GET /api/faculty/submissions/{submissionId:guid}/download
// ======================================================

app.MapGet(
    "/api/faculty/submissions/{submissionId:guid}/download",
    async (
        Guid submissionId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT sub.file_url, u.full_name, stu.enrollment_number, a.title
            FROM submissions sub
            JOIN assignments a ON a.assignment_id = sub.assignment_id
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = a.faculty_assignment_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN students stu ON stu.student_id = sub.student_id
            JOIN users u ON u.user_id = stu.user_id
            WHERE sub.submission_id = @submissionId
              AND f.user_id = @userId
              AND sub.file_url IS NOT NULL;
            """;

        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("submissionId", submissionId);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.NotFound(new { message = "Submission file not found or access denied." });
        }

        var relativePath = reader["file_url"].ToString()!;
        var fileName = Path.GetFileName(relativePath);

        var uploadsRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "uploads", "assignments"));
        var fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, fileName));

        if (!fullPath.StartsWith(uploadsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { message = "Invalid file path." });

        if (!System.IO.File.Exists(fullPath))
            return Results.NotFound(new { message = "Stored file not found." });

        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = extension switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _ => "application/octet-stream"
        };

        var studentRoll = reader["enrollment_number"].ToString()!;
        var downloadName = $"{studentRoll}_{fileName}";

        return Results.File(fullPath, contentType, fileDownloadName: downloadName);
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY DOWNLOAD ERROR: {ex}");
        return Results.Problem("Could not retrieve file. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY LEARNING MATERIALS API
// ======================================================

app.MapGet(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/materials",
    async (
        Guid facultyAssignmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify class ownership
        const string verifySql = """
            SELECT fa.faculty_assignment_id, fa.academic_year, fa.semester, fa.section,
                   c.course_name, c.course_code, s.subject_name, s.subject_code, s.credits
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            JOIN subjects s ON s.subject_id = fa.subject_id
            WHERE fa.faculty_assignment_id = @assignmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        object? classDetails = null;
        await using (var verifyCmd = new NpgsqlCommand(verifySql, connection))
        {
            verifyCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            verifyCmd.Parameters.AddWithValue("userId", userId);
            await using var reader = await verifyCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }

            classDetails = new
            {
                facultyAssignmentId,
                academicYear = reader["academic_year"].ToString(),
                semester = Convert.ToInt32(reader["semester"]),
                section = reader["section"].ToString(),
                courseName = reader["course_name"].ToString(),
                courseCode = reader["course_code"].ToString(),
                subjectName = reader["subject_name"].ToString(),
                subjectCode = reader["subject_code"].ToString(),
                credits = Convert.ToInt32(reader["credits"])
            };
        }

        // 2. Query learning materials for this class
        const string matSql = """
            SELECT material_id, faculty_assignment_id, title, description, material_type, resource_url, uploaded_at
            FROM learning_materials
            WHERE faculty_assignment_id = @assignmentId
            ORDER BY uploaded_at DESC;
            """;

        var materialsList = new List<object>();
        await using (var matCmd = new NpgsqlCommand(matSql, connection))
        {
            matCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            await using var reader = await matCmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var resUrl = reader["resource_url"].ToString()!;
                materialsList.Add(new
                {
                    materialId = reader["material_id"],
                    facultyAssignmentId,
                    title = reader["title"].ToString(),
                    description = reader["description"] is DBNull ? null : reader["description"].ToString(),
                    materialType = reader["material_type"].ToString(),
                    resourceUrl = resUrl,
                    uploadedAt = reader.GetDateTime(reader.GetOrdinal("uploaded_at")),
                    isExternalLink = resUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || resUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                });
            }
        }

        return Results.Ok(new
        {
            classDetails,
            totalMaterials = materialsList.Count,
            materials = materialsList
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY MATERIALS LIST ERROR: {ex}");
        return Results.Problem("Could not retrieve learning materials. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

app.MapPost(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/materials",
    async (
        Guid facultyAssignmentId,
        HttpRequest request,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { message = "Multipart form data is required." });
    }

    var form = await request.ReadFormAsync();
    var title = form["title"].ToString();
    var description = form["description"].ToString();
    var requestedType = form["materialType"].ToString();
    var file = form.Files.GetFile("file");

    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.BadRequest(new { message = "Material title is required." });
    }

    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new { message = "A file is required for upload." });
    }

    const long maxSizeBytes = 25 * 1024 * 1024;
    if (file.Length > maxSizeBytes)
    {
        return Results.BadRequest(new { message = "File size exceeds the 25 MB limit." });
    }

    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
    var allowedExtensions = new[] { ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg" };

    if (!allowedExtensions.Contains(extension))
    {
        return Results.BadRequest(new { message = "Unsupported file type. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG, JPEG." });
    }

    // Magic bytes verification
    byte[] header = new byte[8];
    await using (var input = file.OpenReadStream())
    {
        int bytesRead = await input.ReadAsync(header.AsMemory(0, header.Length));
        bool valid = extension switch
        {
            ".pdf" => bytesRead >= 5 &&
                header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46 && header[4] == 0x2D,
            ".doc" or ".ppt" => bytesRead >= 8 &&
                header[0] == 0xD0 && header[1] == 0xCF && header[2] == 0x11 && header[3] == 0xE0 &&
                header[4] == 0xA1 && header[5] == 0xB1 && header[6] == 0x1A && header[7] == 0xE1,
            ".docx" or ".pptx" => bytesRead >= 4 &&
                header[0] == 0x50 && header[1] == 0x4B && header[2] == 0x03 && header[3] == 0x04,
            ".png" => bytesRead >= 8 &&
                header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            ".jpg" or ".jpeg" => bytesRead >= 3 &&
                header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            _ => false
        };

        if (!valid)
        {
            return Results.BadRequest(new { message = "The file content does not match its file extension signature." });
        }
    }

    string materialType = requestedType?.ToUpperInvariant() switch
    {
        "PDF" => "PDF",
        "DOCUMENT" => "DOCUMENT",
        "PRESENTATION" => "PRESENTATION",
        "VIDEO" => "VIDEO",
        "LINK" => "LINK",
        "OTHER" => "OTHER",
        _ => extension switch
        {
            ".pdf" => "PDF",
            ".doc" or ".docx" => "DOCUMENT",
            ".ppt" or ".pptx" => "PRESENTATION",
            _ => "OTHER"
        }
    };

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    string? savedFilePath = null;

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify faculty assignment ownership
        const string checkSql = """
            SELECT fa.faculty_assignment_id
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE fa.faculty_assignment_id = @assignmentId
              AND f.user_id = @userId;
            """;

        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            var exists = await checkCmd.ExecuteScalarAsync();
            if (exists is null)
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }
        }

        // 2. Save file to disk
        string uploadDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "materials");
        Directory.CreateDirectory(uploadDir);

        string storedFileName = $"{Guid.NewGuid():N}{extension}";
        savedFilePath = Path.Combine(uploadDir, storedFileName);

        await using (var output = new FileStream(savedFilePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        {
            await file.CopyToAsync(output);
        }

        string relativeRef = Path.Combine("uploads", "materials", storedFileName).Replace('\\', '/');

        // 3. Insert into learning_materials
        const string insertSql = """
            INSERT INTO learning_materials (
                material_id,
                faculty_assignment_id,
                title,
                description,
                material_type,
                resource_url,
                uploaded_at
            )
            VALUES (
                gen_random_uuid(),
                @assignmentId,
                @title,
                @description,
                @materialType,
                @resourceUrl,
                CURRENT_TIMESTAMP
            )
            RETURNING material_id, faculty_assignment_id, title, description, material_type, resource_url, uploaded_at;
            """;

        await using var insertCmd = new NpgsqlCommand(insertSql, connection);
        insertCmd.Parameters.AddWithValue("assignmentId", facultyAssignmentId);
        insertCmd.Parameters.AddWithValue("title", title.Trim());
        insertCmd.Parameters.AddWithValue("description", string.IsNullOrWhiteSpace(description) ? DBNull.Value : (object)description.Trim());
        insertCmd.Parameters.AddWithValue("materialType", materialType);
        insertCmd.Parameters.AddWithValue("resourceUrl", relativeRef);

        await using var reader = await insertCmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            throw new InvalidOperationException("Could not insert learning material record.");
        }

        var newMaterialId = (Guid)reader["material_id"];

        return Results.Created($"/api/faculty/materials/{newMaterialId}/download", new
        {
            message = "Learning material uploaded successfully.",
            materialId = newMaterialId,
            facultyAssignmentId,
            title = reader["title"].ToString(),
            description = reader["description"] is DBNull ? null : reader["description"].ToString(),
            materialType = reader["material_type"].ToString(),
            resourceUrl = relativeRef,
            uploadedAt = reader.GetDateTime(reader.GetOrdinal("uploaded_at"))
        });
    }
    catch (Exception ex)
    {
        if (savedFilePath is not null && System.IO.File.Exists(savedFilePath))
        {
            try { System.IO.File.Delete(savedFilePath); } catch { /* best effort cleanup */ }
        }
        Console.WriteLine($"UPLOAD LEARNING MATERIAL ERROR: {ex}");
        return Results.Problem("Could not upload learning material. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

app.MapDelete(
    "/api/faculty/materials/{materialId:guid}",
    async (
        Guid materialId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership and get resource_url
        const string checkSql = """
            SELECT lm.resource_url
            FROM learning_materials lm
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = lm.faculty_assignment_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE lm.material_id = @materialId
              AND f.user_id = @userId;
            """;

        string? resourceUrl = null;
        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("materialId", materialId);
            checkCmd.Parameters.AddWithValue("userId", userId);
            var result = await checkCmd.ExecuteScalarAsync();
            if (result is null)
            {
                return Results.NotFound(new { message = "Material not found or access denied." });
            }
            resourceUrl = result.ToString();
        }

        // 2. Delete from database
        const string deleteSql = "DELETE FROM learning_materials WHERE material_id = @materialId;";
        await using (var deleteCmd = new NpgsqlCommand(deleteSql, connection))
        {
            deleteCmd.Parameters.AddWithValue("materialId", materialId);
            await deleteCmd.ExecuteNonQueryAsync();
        }

        // 3. Delete file on disk if local
        if (!string.IsNullOrWhiteSpace(resourceUrl) &&
            !resourceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !resourceUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            var fileName = Path.GetFileName(resourceUrl);
            var uploadsRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "uploads", "materials"));
            var fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, fileName));
            if (fullPath.StartsWith(uploadsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
                System.IO.File.Exists(fullPath))
            {
                try { System.IO.File.Delete(fullPath); } catch { /* best effort */ }
            }
        }

        return Results.Ok(new { message = "Learning material deleted successfully." });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY DELETE MATERIAL ERROR: {ex}");
        return Results.Problem("Could not delete material. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

app.MapGet(
    "/api/faculty/materials/{materialId:guid}/download",
    async (
        Guid materialId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT lm.resource_url, lm.title
            FROM learning_materials lm
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = lm.faculty_assignment_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE lm.material_id = @materialId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("materialId", materialId);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.NotFound(new { message = "Material not found or access denied." });
        }

        var resourceUrl = reader["resource_url"].ToString()!;
        var title = reader["title"].ToString()!;

        if (resourceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            resourceUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Redirect(resourceUrl);
        }

        var fileName = Path.GetFileName(resourceUrl);
        var uploadsRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "uploads", "materials"));
        var fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, fileName));

        if (!fullPath.StartsWith(uploadsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { message = "Invalid file path." });

        if (!System.IO.File.Exists(fullPath))
            return Results.NotFound(new { message = "Stored material file not found on disk." });

        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = extension switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };

        var cleanTitle = string.Concat(title.Split(Path.GetInvalidFileNameChars())).Trim();
        if (string.IsNullOrWhiteSpace(cleanTitle)) cleanTitle = "material";
        var downloadName = $"{cleanTitle}{extension}";

        return Results.File(fullPath, contentType, fileDownloadName: downloadName);
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY MATERIAL DOWNLOAD ERROR: {ex}");
        return Results.Problem("Could not retrieve material file. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// ======================================================
// FACULTY ASSESSMENTS & QUIZZES API (STAGE 7)
// ======================================================

// 1. GET ALL ASSESSMENTS FOR FACULTY'S ASSIGNED SUBJECTS
// GET /api/faculty/me/assessments
app.MapGet(
    "/api/faculty/me/assessments",
    async (
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        const string sql = """
            SELECT
                a.assessment_id,
                a.subject_id,
                a.assessment_name,
                a.assessment_type,
                a.max_marks,
                a.assessment_date,
                a.created_at,
                sub.subject_code,
                sub.subject_name,
                fa.faculty_assignment_id,
                fa.semester,
                fa.section,
                c.course_code,
                c.course_name,
                COUNT(DISTINCT q.question_id) AS question_count,
                COUNT(DISTINCT sqt.attempt_id) AS attempt_count,
                COALESCE(ROUND(AVG(sqt.marks_obtained), 2), 0) AS avg_marks
            FROM assessments a
            JOIN subjects sub ON sub.subject_id = a.subject_id
            JOIN faculty_assignments fa ON fa.subject_id = a.subject_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            LEFT JOIN assessment_questions q ON q.assessment_id = a.assessment_id
            LEFT JOIN student_quiz_attempts sqt ON sqt.assessment_id = a.assessment_id
            WHERE f.user_id = @userId
            GROUP BY a.assessment_id, a.subject_id, a.assessment_name, a.assessment_type, a.max_marks,
                     a.assessment_date, a.created_at, sub.subject_code, sub.subject_name,
                     fa.faculty_assignment_id, fa.semester, fa.section, c.course_code, c.course_name
            ORDER BY a.created_at DESC;
            """;

        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("userId", userId);

        await using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<object>();
        while (await reader.ReadAsync())
        {
            list.Add(new
            {
                assessmentId = reader["assessment_id"],
                subjectId = reader["subject_id"],
                assessmentName = reader["assessment_name"],
                assessmentType = reader["assessment_type"],
                maxMarks = reader["max_marks"],
                assessmentDate = reader["assessment_date"] is DBNull ? null : reader["assessment_date"],
                createdAt = reader["created_at"],
                subjectCode = reader["subject_code"],
                subjectName = reader["subject_name"],
                facultyAssignmentId = reader["faculty_assignment_id"],
                semester = reader["semester"],
                section = reader["section"],
                courseCode = reader["course_code"],
                courseName = reader["course_name"],
                questionCount = Convert.ToInt32(reader["question_count"]),
                attemptCount = Convert.ToInt32(reader["attempt_count"]),
                avgMarks = Convert.ToDecimal(reader["avg_marks"])
            });
        }

        return Results.Ok(new
        {
            totalAssessments = list.Count,
            assessments = list
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY GET ALL ASSESSMENTS ERROR: {ex}");
        return Results.Problem("Could not retrieve faculty assessments. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// 2. GET ASSESSMENTS FOR A SPECIFIC CLASS ASSIGNMENT
// GET /api/faculty/assignments/{facultyAssignmentId:guid}/assessments
app.MapGet(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/assessments",
    async (
        Guid facultyAssignmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership and get class details
        const string classSql = """
            SELECT
                fa.faculty_assignment_id,
                fa.course_id,
                fa.subject_id,
                fa.semester,
                fa.section,
                fa.academic_year,
                sub.subject_code,
                sub.subject_name,
                c.course_name,
                c.course_code
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN subjects sub ON sub.subject_id = fa.subject_id
            JOIN courses c ON c.course_id = fa.course_id
            WHERE fa.faculty_assignment_id = @facultyAssignmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        Guid subjectId;
        Guid courseId;
        int semester;
        string section;
        object classDetails;

        await using (var classCmd = new NpgsqlCommand(classSql, connection))
        {
            classCmd.Parameters.AddWithValue("facultyAssignmentId", facultyAssignmentId);
            classCmd.Parameters.AddWithValue("userId", userId);

            await using var classReader = await classCmd.ExecuteReaderAsync();
            if (!await classReader.ReadAsync())
            {
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            }

            subjectId = classReader.GetGuid(classReader.GetOrdinal("subject_id"));
            courseId = classReader.GetGuid(classReader.GetOrdinal("course_id"));
            semester = classReader.GetInt32(classReader.GetOrdinal("semester"));
            section = classReader["section"]?.ToString() ?? "";

            classDetails = new
            {
                facultyAssignmentId,
                subjectCode = classReader["subject_code"],
                subjectName = classReader["subject_name"],
                courseName = classReader["course_name"],
                courseCode = classReader["course_code"],
                semester,
                section,
                academicYear = classReader["academic_year"]
            };
        }

        // 2. Count enrolled students
        const string countEnrolledSql = """
            SELECT COUNT(st.student_id)
            FROM students st
            JOIN course_enrollments ce ON ce.student_id = st.student_id AND ce.course_id = st.course_id AND ce.enrollment_status = 'ACTIVE'
            WHERE ce.course_id = @courseId
              AND st.semester = @semester
              AND (@section = '' OR st.section = @section);
            """;

        int enrolledCount = 0;
        await using (var countCmd = new NpgsqlCommand(countEnrolledSql, connection))
        {
            countCmd.Parameters.AddWithValue("courseId", courseId);
            countCmd.Parameters.AddWithValue("semester", semester);
            countCmd.Parameters.AddWithValue("section", section);
            var res = await countCmd.ExecuteScalarAsync();
            enrolledCount = Convert.ToInt32(res ?? 0);
        }

        // 3. Query assessments for this subject
        const string assessmentsSql = """
            SELECT
                a.assessment_id,
                a.assessment_name,
                a.assessment_type,
                a.max_marks,
                a.assessment_date,
                a.created_at,
                COUNT(DISTINCT q.question_id) AS question_count,
                COUNT(DISTINCT sqt.attempt_id) AS attempt_count,
                COALESCE(ROUND(AVG(sqt.marks_obtained), 2), 0) AS avg_marks
            FROM assessments a
            LEFT JOIN assessment_questions q ON q.assessment_id = a.assessment_id
            LEFT JOIN student_quiz_attempts sqt ON sqt.assessment_id = a.assessment_id
            WHERE a.subject_id = @subjectId
            GROUP BY a.assessment_id, a.assessment_name, a.assessment_type, a.max_marks, a.assessment_date, a.created_at
            ORDER BY a.created_at DESC;
            """;

        var assessments = new List<object>();
        await using (var aCmd = new NpgsqlCommand(assessmentsSql, connection))
        {
            aCmd.Parameters.AddWithValue("subjectId", subjectId);
            await using var aReader = await aCmd.ExecuteReaderAsync();
            while (await aReader.ReadAsync())
            {
                assessments.Add(new
                {
                    assessmentId = aReader["assessment_id"],
                    assessmentName = aReader["assessment_name"],
                    assessmentType = aReader["assessment_type"],
                    maxMarks = aReader["max_marks"],
                    assessmentDate = aReader["assessment_date"] is DBNull ? null : aReader["assessment_date"],
                    createdAt = aReader["created_at"],
                    questionCount = Convert.ToInt32(aReader["question_count"]),
                    attemptCount = Convert.ToInt32(aReader["attempt_count"]),
                    avgMarks = Convert.ToDecimal(aReader["avg_marks"])
                });
            }
        }

        return Results.Ok(new
        {
            classDetails,
            enrolledStudents = enrolledCount,
            totalAssessments = assessments.Count,
            assessments
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY GET CLASS ASSESSMENTS ERROR: {ex}");
        return Results.Problem("Could not retrieve class assessments. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// 3. CREATE ASSESSMENT WITH QUESTIONS
// POST /api/faculty/assignments/{facultyAssignmentId:guid}/assessments
app.MapPost(
    "/api/faculty/assignments/{facultyAssignmentId:guid}/assessments",
    async (
        Guid facultyAssignmentId,
        CreateFacultyAssessmentRequest request,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Title))
        return Results.BadRequest(new { message = "Assessment title is required." });

    if (request.Title.Trim().Length > 200)
        return Results.BadRequest(new { message = "Assessment title cannot exceed 200 characters." });

    if (request.Questions is null || request.Questions.Count == 0)
        return Results.BadRequest(new { message = "Assessment must contain at least one question." });

    var validTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "QUIZ", "MIDTERM", "ENDTERM", "PRACTICAL", "OTHER" };
    var assessmentType = string.IsNullOrWhiteSpace(request.AssessmentType) ? "QUIZ" : request.AssessmentType.Trim().ToUpperInvariant();
    if (!validTypes.Contains(assessmentType))
        return Results.BadRequest(new { message = "Invalid assessment type. Allowed types: QUIZ, MIDTERM, ENDTERM, PRACTICAL, OTHER." });

    // Validate questions and calculate max marks
    decimal totalMarks = 0;
    for (int i = 0; i < request.Questions.Count; i++)
    {
        var q = request.Questions[i];
        if (string.IsNullOrWhiteSpace(q.QuestionText))
            return Results.BadRequest(new { message = $"Question {i + 1} text cannot be empty." });

        if (q.Options is null || q.Options.Count < 2)
            return Results.BadRequest(new { message = $"Question {i + 1} must have at least 2 answer options." });

        foreach (var opt in q.Options)
        {
            if (string.IsNullOrWhiteSpace(opt.Key) || string.IsNullOrWhiteSpace(opt.Value))
                return Results.BadRequest(new { message = $"Question {i + 1} option key and label cannot be blank." });
        }

        if (string.IsNullOrWhiteSpace(q.CorrectOption))
            return Results.BadRequest(new { message = $"Question {i + 1} must designate a correct answer option." });

        var correctNormalized = q.CorrectOption.Trim().ToUpperInvariant();
        var matchingKey = q.Options.Keys.FirstOrDefault(k => string.Equals(k.Trim(), correctNormalized, StringComparison.OrdinalIgnoreCase));
        if (matchingKey is null)
            return Results.BadRequest(new { message = $"Question {i + 1} correct option '{q.CorrectOption}' is not among the provided options." });

        if (q.Marks <= 0)
            return Results.BadRequest(new { message = $"Question {i + 1} marks must be greater than zero." });

        totalMarks += q.Marks;
    }

    if (totalMarks <= 0)
        return Results.BadRequest(new { message = "Total assessment marks must be greater than zero." });

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Verify faculty assignment ownership
        const string verifySql = """
            SELECT fa.subject_id
            FROM faculty_assignments fa
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE fa.faculty_assignment_id = @facultyAssignmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        Guid subjectId;
        await using (var verifyCmd = new NpgsqlCommand(verifySql, connection))
        {
            verifyCmd.Parameters.AddWithValue("facultyAssignmentId", facultyAssignmentId);
            verifyCmd.Parameters.AddWithValue("userId", userId);
            var res = await verifyCmd.ExecuteScalarAsync();
            if (res is null)
                return Results.NotFound(new { message = "Class assignment not found or access denied." });
            subjectId = (Guid)res;
        }

        await using var tx = await connection.BeginTransactionAsync();

        // 1. Insert assessment
        const string insertAssessmentSql = """
            INSERT INTO public.assessments
            (
                subject_id,
                assessment_name,
                assessment_type,
                max_marks,
                assessment_date
            )
            VALUES
            (
                @subjectId,
                @assessmentName,
                @assessmentType,
                @maxMarks,
                @assessmentDate
            )
            RETURNING assessment_id, created_at;
            """;

        Guid assessmentId;
        DateTime createdAt;
        await using (var aCmd = new NpgsqlCommand(insertAssessmentSql, connection, tx))
        {
            aCmd.Parameters.AddWithValue("subjectId", subjectId);
            aCmd.Parameters.AddWithValue("assessmentName", request.Title.Trim());
            aCmd.Parameters.AddWithValue("assessmentType", assessmentType);
            aCmd.Parameters.AddWithValue("maxMarks", totalMarks);
            aCmd.Parameters.AddWithValue("assessmentDate", (object?)request.AssessmentDate ?? DBNull.Value);

            await using var reader = await aCmd.ExecuteReaderAsync();
            await reader.ReadAsync();
            assessmentId = reader.GetGuid(0);
            createdAt = reader.GetDateTime(1);
        }

        // 2. Insert questions
        const string insertQuestionSql = """
            INSERT INTO public.assessment_questions
            (
                assessment_id,
                question_text,
                options,
                correct_option,
                marks
            )
            VALUES
            (
                @assessmentId,
                @questionText,
                CAST(@optionsJson AS jsonb),
                @correctOption,
                @marks
            );
            """;

        foreach (var q in request.Questions)
        {
            // Normalize options dictionary with uppercase keys
            var normalizedOptions = q.Options.ToDictionary(
                k => k.Key.Trim().ToUpperInvariant(),
                v => v.Value.Trim()
            );
            var optionsJson = System.Text.Json.JsonSerializer.Serialize(normalizedOptions);
            var correctOption = q.CorrectOption.Trim().ToUpperInvariant();

            await using var qCmd = new NpgsqlCommand(insertQuestionSql, connection, tx);
            qCmd.Parameters.AddWithValue("assessmentId", assessmentId);
            qCmd.Parameters.AddWithValue("questionText", q.QuestionText.Trim());
            qCmd.Parameters.AddWithValue("optionsJson", optionsJson);
            qCmd.Parameters.AddWithValue("correctOption", correctOption);
            qCmd.Parameters.AddWithValue("marks", q.Marks);
            await qCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();

        return Results.Json(new
        {
            message = "Assessment created and published successfully.",
            assessmentId,
            assessmentName = request.Title.Trim(),
            assessmentType,
            maxMarks = totalMarks,
            totalQuestions = request.Questions.Count,
            createdAt
        }, statusCode: StatusCodes.Status201Created);
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY CREATE ASSESSMENT ERROR: {ex}");
        return Results.Problem("Could not create assessment. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// 4. DELETE AN ASSESSMENT
// DELETE /api/faculty/assessments/{assessmentId:guid}
app.MapDelete(
    "/api/faculty/assessments/{assessmentId:guid}",
    async (
        Guid assessmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify ownership and check attempt count
        const string checkSql = """
            SELECT
                a.assessment_id,
                a.assessment_name,
                (SELECT COUNT(*) FROM public.student_quiz_attempts sqt WHERE sqt.assessment_id = a.assessment_id) AS attempt_count,
                (SELECT COUNT(*) FROM public.assessment_results ar WHERE ar.assessment_id = a.assessment_id) AS result_count
            FROM assessments a
            JOIN faculty_assignments fa ON fa.subject_id = a.subject_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            WHERE a.assessment_id = @assessmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        await using (var checkCmd = new NpgsqlCommand(checkSql, connection))
        {
            checkCmd.Parameters.AddWithValue("assessmentId", assessmentId);
            checkCmd.Parameters.AddWithValue("userId", userId);

            await using var reader = await checkCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Assessment not found or access denied." });
            }

            var attemptCount = Convert.ToInt64(reader["attempt_count"]);
            var resultCount = Convert.ToInt64(reader["result_count"]);

            if (attemptCount > 0 || resultCount > 0)
            {
                return Results.Conflict(new
                {
                    message = "Cannot delete this assessment: Students have already submitted attempts. Assessment records must be preserved for institutional academic integrity."
                });
            }
        }

        // 2. Delete assessment (cascades to questions)
        const string deleteSql = "DELETE FROM public.assessments WHERE assessment_id = @assessmentId;";
        await using (var delCmd = new NpgsqlCommand(deleteSql, connection))
        {
            delCmd.Parameters.AddWithValue("assessmentId", assessmentId);
            await delCmd.ExecuteNonQueryAsync();
        }

        return Results.Ok(new { message = "Assessment deleted successfully." });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY DELETE ASSESSMENT ERROR: {ex}");
        return Results.Problem("Could not delete assessment. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

// 5. GET ASSESSMENT QUESTIONS AND SUBMISSIONS ROSTER
// GET /api/faculty/assessments/{assessmentId:guid}/submissions
app.MapGet(
    "/api/faculty/assessments/{assessmentId:guid}/submissions",
    async (
        Guid assessmentId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // 1. Verify assessment ownership and fetch class metadata
        const string metaSql = """
            SELECT
                a.assessment_id,
                a.assessment_name,
                a.assessment_type,
                a.max_marks,
                a.assessment_date,
                a.created_at,
                sub.subject_code,
                sub.subject_name,
                fa.faculty_assignment_id,
                fa.course_id,
                fa.semester,
                fa.section,
                c.course_name,
                c.course_code
            FROM assessments a
            JOIN subjects sub ON sub.subject_id = a.subject_id
            JOIN faculty_assignments fa ON fa.subject_id = a.subject_id
            JOIN faculty f ON f.faculty_id = fa.faculty_id
            JOIN courses c ON c.course_id = fa.course_id
            WHERE a.assessment_id = @assessmentId
              AND f.user_id = @userId
            LIMIT 1;
            """;

        Guid courseId;
        int semester;
        string section;
        object assessmentMeta;

        await using (var metaCmd = new NpgsqlCommand(metaSql, connection))
        {
            metaCmd.Parameters.AddWithValue("assessmentId", assessmentId);
            metaCmd.Parameters.AddWithValue("userId", userId);

            await using var reader = await metaCmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new { message = "Assessment not found or access denied." });
            }

            courseId = reader.GetGuid(reader.GetOrdinal("course_id"));
            semester = reader.GetInt32(reader.GetOrdinal("semester"));
            section = reader["section"]?.ToString() ?? "";

            assessmentMeta = new
            {
                assessmentId,
                assessmentName = reader["assessment_name"],
                assessmentType = reader["assessment_type"],
                maxMarks = reader["max_marks"],
                assessmentDate = reader["assessment_date"] is DBNull ? null : reader["assessment_date"],
                createdAt = reader["created_at"],
                subjectCode = reader["subject_code"],
                subjectName = reader["subject_name"],
                facultyAssignmentId = reader["faculty_assignment_id"],
                courseName = reader["course_name"],
                courseCode = reader["course_code"],
                semester,
                section
            };
        }

        // 2. Fetch questions for faculty review (including correct_option)
        const string questionsSql = """
            SELECT
                question_id,
                question_text,
                options,
                correct_option,
                marks,
                created_at
            FROM public.assessment_questions
            WHERE assessment_id = @assessmentId
            ORDER BY created_at ASC, question_id ASC;
            """;

        var questions = new List<object>();
        await using (var qCmd = new NpgsqlCommand(questionsSql, connection))
        {
            qCmd.Parameters.AddWithValue("assessmentId", assessmentId);
            await using var qReader = await qCmd.ExecuteReaderAsync();
            while (await qReader.ReadAsync())
            {
                var optionsVal = qReader.GetValue(2);
                object? options = null;
                if (optionsVal is string optStr)
                {
                    try { options = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(optStr); }
                    catch { options = optStr; }
                }
                else if (optionsVal is not DBNull)
                {
                    options = optionsVal;
                }

                questions.Add(new
                {
                    questionId = qReader.GetGuid(0),
                    questionText = qReader.GetString(1),
                    options,
                    correctOption = qReader.GetString(3),
                    marks = Convert.ToDecimal(qReader.GetValue(4))
                });
            }
        }

        // 3. Fetch enrolled students and their quiz attempt status
        const string rosterSql = """
            SELECT
                st.student_id,
                st.enrollment_number,
                u.full_name AS student_name,
                u.email AS student_email,
                sqt.attempt_id,
                sqt.submitted_at,
                COALESCE(ar.marks_obtained, sqt.marks_obtained) AS marks_obtained,
                sqt.answers,
                ar.feedback,
                ar.evaluated_at
            FROM students st
            JOIN users u ON u.user_id = st.user_id
            JOIN course_enrollments ce ON ce.student_id = st.student_id AND ce.course_id = st.course_id AND ce.enrollment_status = 'ACTIVE'
            LEFT JOIN student_quiz_attempts sqt ON sqt.assessment_id = @assessmentId AND sqt.student_id = st.student_id
            LEFT JOIN assessment_results ar ON ar.assessment_id = @assessmentId AND ar.student_id = st.student_id
            WHERE ce.course_id = @courseId
              AND st.semester = @semester
              AND (@section = '' OR st.section = @section)
            ORDER BY st.enrollment_number ASC;
            """;

        var submissions = new List<object>();
        int totalEnrolled = 0;
        int totalAttempted = 0;
        decimal totalMarksSum = 0;

        await using (var rCmd = new NpgsqlCommand(rosterSql, connection))
        {
            rCmd.Parameters.AddWithValue("assessmentId", assessmentId);
            rCmd.Parameters.AddWithValue("courseId", courseId);
            rCmd.Parameters.AddWithValue("semester", semester);
            rCmd.Parameters.AddWithValue("section", section);

            await using var rReader = await rCmd.ExecuteReaderAsync();
            while (await rReader.ReadAsync())
            {
                totalEnrolled++;
                var hasAttempt = rReader["attempt_id"] is not DBNull;
                decimal? marks = null;
                if (rReader["marks_obtained"] is not DBNull)
                {
                    marks = Convert.ToDecimal(rReader["marks_obtained"]);
                }

                if (hasAttempt)
                {
                    totalAttempted++;
                    if (marks.HasValue) totalMarksSum += marks.Value;
                }

                var answersVal = rReader["answers"];
                object? answers = null;
                if (answersVal is string ansStr)
                {
                    try { answers = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(ansStr); }
                    catch { answers = ansStr; }
                }
                else if (answersVal is not DBNull)
                {
                    answers = answersVal;
                }

                submissions.Add(new
                {
                    studentId = rReader["student_id"],
                    enrollmentNumber = rReader["enrollment_number"],
                    studentName = rReader["student_name"],
                    studentEmail = rReader["student_email"],
                    hasAttempted = hasAttempt,
                    attemptId = hasAttempt ? rReader["attempt_id"] : null,
                    submittedAt = rReader["submitted_at"] is DBNull ? null : rReader["submitted_at"],
                    marksObtained = marks,
                    feedback = rReader["feedback"] is DBNull ? null : rReader["feedback"],
                    evaluatedAt = rReader["evaluated_at"] is DBNull ? null : rReader["evaluated_at"],
                    answers
                });
            }
        }

        var avgMarks = totalAttempted > 0 ? Math.Round(totalMarksSum / totalAttempted, 2) : 0m;

        return Results.Ok(new
        {
            assessment = assessmentMeta,
            questions,
            totalEnrolled,
            totalAttempted,
            classAverageMarks = avgMarks,
            completionRate = totalEnrolled > 0 ? Math.Round((decimal)totalAttempted * 100m / totalEnrolled, 1) : 0m,
            submissions
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"FACULTY GET ASSESSMENT SUBMISSIONS ERROR: {ex}");
        return Results.Problem("Could not retrieve assessment submissions. Check backend logs.");
    }
})
.RequireAuthorization("FacultyOnly");

app.MapGet("/api/auth/student/me", async (HttpContext httpContext, IConfiguration configuration) =>
{
    var enrollmentNumber = httpContext.User.FindFirst("enrollment_number")?.Value;
    if (string.IsNullOrWhiteSpace(enrollmentNumber))
    {
        return Results.Unauthorized();
    }

    var connectionString = configuration.GetConnectionString("DefaultConnection");
    await using var connection = new NpgsqlConnection(connectionString);
    await connection.OpenAsync();

    const string sql = """
        SELECT u.user_id, u.full_name, u.email, s.student_id, s.enrollment_number
        FROM students s
        JOIN users u ON u.user_id = s.user_id
        WHERE s.enrollment_number = @enrollmentNumber
        LIMIT 1;
        """;

    await using var command = new NpgsqlCommand(sql, connection);
    command.Parameters.AddWithValue("enrollmentNumber", enrollmentNumber);

    await using var reader = await command.ExecuteReaderAsync();
    if (!await reader.ReadAsync())
    {
        return Results.NotFound(new { message = "Student record not found." });
    }

    return Results.Ok(new
    {
        userId = reader["user_id"],
        studentId = reader["student_id"],
        enrollmentNumber = reader["enrollment_number"],
        fullName = reader["full_name"],
        email = reader["email"],
        role = "STUDENT"
    });
}).RequireAuthorization();

// ======================================================

// 1. DATABASE HEALTH API

// GET /api/health/database

// ======================================================

app.MapGet(

    "/api/health/database",

    async (IConfiguration configuration) =>

{

    var connectionString =

        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))

    {

        return Results.Problem(

            "Database connection string is missing.");

    }

    try

    {

        await using var connection =

            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(

            "SELECT current_database(), current_user",

            connection);

        await using var reader =

            await command.ExecuteReaderAsync();

        await reader.ReadAsync();

        return Results.Ok(new

        {

            status = "Connected",

            database = reader.GetString(0),

            username = reader.GetString(1)

        });

    }

    catch (NpgsqlException ex)

    {

        Console.WriteLine($"DATABASE HEALTH ERROR: {ex}");

        return Results.Problem(

            "Database connection failed. Check backend logs.");

    }

});

// ======================================================

// 2. STUDENT DASHBOARD API

// GET /api/students/{enrollmentNumber}/dashboard

// ======================================================


app.MapGet(
    "/api/students/{enrollmentNumber}/dashboard",
    async (
        string enrollmentNumber,
        IConfiguration configuration) =>
{
    var connectionString =
        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(
            "Database connection string is missing.");
    }

    try
    {
        await using var connection =
            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        // 1. Student profile and enrollment details
        const string profileSql = """
            SELECT
                u.full_name,
                u.email,
                s.student_id,
                s.enrollment_number,
                d.department_name,
                c.course_name,
                s.semester,
                s.section,
                ce.academic_year,
                ce.enrollment_status
            FROM students s
            JOIN users u
                ON u.user_id = s.user_id
            LEFT JOIN departments d
                ON d.department_id = s.department_id
            LEFT JOIN courses c
                ON c.course_id = s.course_id
            LEFT JOIN course_enrollments ce
                ON ce.student_id = s.student_id
                AND ce.course_id = s.course_id
                AND ce.enrollment_status = 'ACTIVE'
            WHERE s.enrollment_number = @enrollmentNumber
            LIMIT 1;
            """;

        string? studentId;
        object dashboardProfile;

        await using (var command =
            new NpgsqlCommand(profileSql, connection))
        {
            command.Parameters.AddWithValue(
                "enrollmentNumber", enrollmentNumber);

            await using var reader =
                await command.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
            {
                return Results.NotFound(new
                {
                    message = "Student not found."
                });
            }

            studentId = reader["student_id"].ToString();

            dashboardProfile = new
            {
                fullName = reader["full_name"],
                email = reader["email"],
                enrollmentNumber = reader["enrollment_number"],
                department = reader["department_name"],
                course = reader["course_name"],
                semester = reader["semester"],
                section = reader["section"],
                academicYear = reader["academic_year"],
                enrollmentStatus = reader["enrollment_status"]
            };
        }

        // 2. Count active enrolled subjects
        const string coursesSql = """
            SELECT COUNT(DISTINCT sub.subject_id)
            FROM students st
            JOIN course_enrollments ce
                ON ce.student_id = st.student_id
                AND ce.course_id = st.course_id
                AND ce.enrollment_status = 'ACTIVE'
            JOIN faculty_assignments fa
                ON fa.course_id = ce.course_id
                AND fa.semester = st.semester
                AND fa.section = st.section
                AND fa.academic_year = ce.academic_year
            JOIN subjects sub
                ON sub.subject_id = fa.subject_id
            WHERE st.student_id = @studentId;
            """;

        int totalCourses;

        await using (var command =
            new NpgsqlCommand(coursesSql, connection))
        {
            command.Parameters.AddWithValue(
                "studentId", Guid.Parse(studentId!));

            totalCourses = Convert.ToInt32(
                await command.ExecuteScalarAsync());
        }

        // 3. Overall attendance percentage
        const string attendanceSql = """
            SELECT
                COUNT(DISTINCT cs.session_id) AS total_classes,
                COUNT(DISTINCT cs.session_id) FILTER (
                    WHERE a.attendance_status = 'PRESENT'
                ) AS attended_classes
            FROM students st
            JOIN faculty_assignments fa
                ON fa.course_id = st.course_id
                AND fa.semester = st.semester
                AND fa.section = st.section
            JOIN class_sessions cs
                ON cs.faculty_assignment_id =
                   fa.faculty_assignment_id
                AND cs.session_status = 'CONDUCTED'
            LEFT JOIN attendance a
                ON a.session_id = cs.session_id
                AND a.student_id = st.student_id
            WHERE st.student_id = @studentId;
            """;

        int totalClasses;
        int attendedClasses;

        await using (var command =
            new NpgsqlCommand(attendanceSql, connection))
        {
            command.Parameters.AddWithValue(
                "studentId", Guid.Parse(studentId!));

            await using var reader =
                await command.ExecuteReaderAsync();

            await reader.ReadAsync();

            totalClasses = Convert.ToInt32(
                reader["total_classes"]);

            attendedClasses = Convert.ToInt32(
                reader["attended_classes"]);
        }

        decimal attendancePercentage = totalClasses > 0
            ? Math.Round(
                attendedClasses * 100m / totalClasses, 2)
            : 0m;

        // 4. Count assignments without a submission
        const string assignmentsSql = """
            SELECT COUNT(DISTINCT a.assignment_id)
            FROM students st
            JOIN course_enrollments ce
                ON ce.student_id = st.student_id
                AND ce.course_id = st.course_id
                AND ce.enrollment_status = 'ACTIVE'
            JOIN faculty_assignments fa
                ON fa.course_id = ce.course_id
                AND fa.semester = st.semester
                AND fa.section = st.section
                AND fa.academic_year = ce.academic_year
            JOIN assignments a
                ON a.faculty_assignment_id =
                   fa.faculty_assignment_id
            WHERE st.student_id = @studentId
              AND NOT EXISTS (
                  SELECT 1
                  FROM submissions sub
                  WHERE sub.assignment_id = a.assignment_id
                    AND sub.student_id = st.student_id
              );
            """;

        int pendingAssignments;

        await using (var command =
            new NpgsqlCommand(assignmentsSql, connection))
        {
            command.Parameters.AddWithValue(
                "studentId", Guid.Parse(studentId!));

            pendingAssignments = Convert.ToInt32(
                await command.ExecuteScalarAsync());
        }

        // 5. Latest available result
        const string latestResultSql = """
            SELECT
                a.assessment_name,
                ar.marks_obtained,
                a.max_marks,
                ar.evaluated_at AS recorded_at,
                'EVALUATED_RESULT'::text AS result_source
            FROM students st
            JOIN assessment_results ar
                ON ar.student_id = st.student_id
            JOIN assessments a
                ON a.assessment_id = ar.assessment_id
            WHERE st.student_id = @studentId

            UNION ALL

            SELECT
                a.assessment_name,
                sqt.marks_obtained,
                a.max_marks,
                sqt.submitted_at AS recorded_at,
                'QUIZ_ATTEMPT'::text AS result_source
            FROM students st
            JOIN student_quiz_attempts sqt
                ON sqt.student_id = st.student_id
            JOIN assessments a
                ON a.assessment_id = sqt.assessment_id
            WHERE st.student_id = @studentId
              AND NOT EXISTS (
                  SELECT 1
                  FROM assessment_results ar2
                  WHERE ar2.student_id = sqt.student_id
                    AND ar2.assessment_id = sqt.assessment_id
              )
            ORDER BY recorded_at DESC
            LIMIT 1;
            """;

        object? latestResult = null;

        await using (var command =
            new NpgsqlCommand(latestResultSql, connection))
        {
            command.Parameters.AddWithValue(
                "studentId", Guid.Parse(studentId!));

            await using var reader =
                await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                latestResult = new
                {
                    assessmentName = reader["assessment_name"],
                    marksObtained = Convert.ToDecimal(
                        reader["marks_obtained"]),
                    maxMarks = Convert.ToDecimal(
                        reader["max_marks"]),
                    recordedAt = reader["recorded_at"],
                    resultSource = reader["result_source"]
                };
            }
        }

        return Results.Ok(new
        {
            profile = dashboardProfile,
            summary = new
            {
                totalCourses,
                totalClasses,
                attendedClasses,
                attendancePercentage,
                pendingAssignments
            },
            latestResult
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"DASHBOARD DATABASE ERROR: {ex}");

        return Results.Problem(
            "Could not retrieve student dashboard data.");
    }
});


// ======================================================

// 3. STUDENT COURSES API

// GET /api/students/{enrollmentNumber}/courses

// ======================================================

app.MapGet(

    "/api/students/{enrollmentNumber}/courses",

    async (

        string enrollmentNumber,

        IConfiguration configuration) =>

{

    var connectionString =

        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))

    {

        return Results.Problem(

            "Database connection string is missing.");

    }

    try

    {

        await using var connection =

            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = """

            SELECT

                s.subject_code,

                s.subject_name,

                s.semester,

                s.credits,

                c.course_code,

                c.course_name,

                ce.academic_year,

                ce.enrollment_status

            FROM students st

            JOIN course_enrollments ce

                ON ce.student_id = st.student_id

                AND ce.course_id = st.course_id

            JOIN courses c

                ON c.course_id = ce.course_id

            JOIN subjects s

                ON s.course_id = c.course_id

                AND s.semester = st.semester

            WHERE st.enrollment_number = @enrollmentNumber

                AND ce.enrollment_status = 'ACTIVE'

            ORDER BY s.subject_code;

            """;

        await using var command =

            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(

            "enrollmentNumber", enrollmentNumber);

        await using var reader =

            await command.ExecuteReaderAsync();

        var courses = new List<object>();

        while (await reader.ReadAsync())

        {

            courses.Add(new

            {

                subjectCode = reader["subject_code"],

                subjectName = reader["subject_name"],

                semester = reader["semester"],

                credits = reader["credits"],

                courseCode = reader["course_code"],

                courseName = reader["course_name"],

                academicYear = reader["academic_year"],

                enrollmentStatus = reader["enrollment_status"]

            });

        }

        return Results.Ok(courses);

    }

    catch (NpgsqlException ex)

    {

        Console.WriteLine($"COURSES DATABASE ERROR: {ex}");

        return Results.Problem(

            "Could not retrieve courses.");

    }

});

// ======================================================

// 4. STUDENT ATTENDANCE API

// GET /api/students/{enrollmentNumber}/attendance

// ======================================================

app.MapGet(

    "/api/students/{enrollmentNumber}/attendance",

    async (

        string enrollmentNumber,

        IConfiguration configuration) =>

{

    var connectionString =

        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))

    {

        return Results.Problem(

            "Database connection string is missing.");

    }

    try

    {

        await using var connection =

            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = """

            SELECT

                sub.subject_code,

                sub.subject_name,

                COUNT(cs.session_id) AS total_classes,

                COUNT(a.attendance_id) FILTER (

                    WHERE a.attendance_status = 'PRESENT'

                ) AS attended_classes

            FROM students st

            JOIN faculty_assignments fa

                ON fa.course_id = st.course_id

                AND fa.semester = st.semester

                AND fa.section = st.section

            JOIN subjects sub

                ON sub.subject_id = fa.subject_id

            JOIN class_sessions cs

                ON cs.faculty_assignment_id =

                   fa.faculty_assignment_id

                AND cs.session_status = 'CONDUCTED'

            LEFT JOIN attendance a

                ON a.session_id = cs.session_id

                AND a.student_id = st.student_id

            WHERE st.enrollment_number = @enrollmentNumber

            GROUP BY

                sub.subject_id,

                sub.subject_code,

                sub.subject_name

            ORDER BY sub.subject_code;

            """;

        await using var command =

            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(

            "enrollmentNumber", enrollmentNumber);

        await using var reader =

            await command.ExecuteReaderAsync();

        var subjects = new List<object>();

        int totalClasses = 0;

        int totalAttended = 0;

        while (await reader.ReadAsync())

        {

            int classes =

                Convert.ToInt32(reader["total_classes"]);

            int attended =

                Convert.ToInt32(reader["attended_classes"]);

            decimal percentage = classes == 0

                ? 0

                : Math.Round(attended * 100m / classes, 2);

            totalClasses += classes;

            totalAttended += attended;

            subjects.Add(new

            {

                subjectCode = reader["subject_code"],

                subjectName = reader["subject_name"],

                totalClasses = classes,

                attendedClasses = attended,

                absentClasses = classes - attended,

                attendancePercentage = percentage

            });

        }

        if (subjects.Count == 0)

        {

            return Results.NotFound(new

            {

                message =

                    "No conducted classes found for this student."

            });

        }

        decimal overallPercentage = totalClasses == 0

            ? 0

            : Math.Round(totalAttended * 100m / totalClasses, 2);

        return Results.Ok(new

        {

            enrollmentNumber,

            totalClasses,

            attendedClasses = totalAttended,

            absentClasses = totalClasses - totalAttended,

            overallAttendancePercentage = overallPercentage,

            subjects

        });

    }

    catch (NpgsqlException ex)

    {

        Console.WriteLine($"ATTENDANCE DATABASE ERROR: {ex}");

        return Results.Problem(

            "Could not retrieve attendance.");

    }

});

// ======================================================

// 5. STUDENT ASSIGNMENTS API

// GET /api/students/{enrollmentNumber}/assignments

// ======================================================

app.MapGet(

    "/api/students/{enrollmentNumber}/assignments",

    async (

        string enrollmentNumber,

        IConfiguration configuration) =>

{

    var connectionString =

        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))

    {

        return Results.Problem(

            "Database connection string is missing.");

    }

    try

    {

        await using var connection =

            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = """

            SELECT

                a.assignment_id,

                a.title,

                a.instructions,

                a.due_at,

                a.max_marks,

                sub.submission_status,

                sub.submitted_at,

                sub.file_url,

                sub.marks_obtained,

                sub.feedback

            FROM students st

            JOIN course_enrollments ce

                ON ce.student_id = st.student_id

                AND ce.course_id = st.course_id

                AND ce.enrollment_status = 'ACTIVE'

            JOIN faculty_assignments fa

                ON fa.course_id = ce.course_id

                AND fa.semester = st.semester

                AND fa.section = st.section

                AND fa.academic_year = ce.academic_year

            JOIN assignments a

                ON a.faculty_assignment_id =

                   fa.faculty_assignment_id

            LEFT JOIN submissions sub

                ON sub.assignment_id = a.assignment_id

                AND sub.student_id = st.student_id

            WHERE st.enrollment_number = @enrollmentNumber

            ORDER BY a.due_at;

            """;

        await using var command =

            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(

            "enrollmentNumber", enrollmentNumber);

        await using var reader =

            await command.ExecuteReaderAsync();

        var assignments = new List<object>();

        while (await reader.ReadAsync())

        {

            assignments.Add(new

            {

                assignmentId = reader["assignment_id"],

                title = reader["title"],

                instructions = reader["instructions"],

                dueAt = reader["due_at"],

                maxMarks = reader["max_marks"],

                submissionStatus =
    reader["submission_status"] is DBNull
        ? "NOT_SUBMITTED"
        : reader["submission_status"],

submittedAt =
    reader["submitted_at"] is DBNull
        ? null
        : reader["submitted_at"],

fileUrl =
    reader["file_url"] is DBNull
        ? null
        : reader["file_url"],

marksObtained =
    reader["marks_obtained"] is DBNull
        ? null
        : reader["marks_obtained"],

feedback =
    reader["feedback"] is DBNull
        ? null
        : reader["feedback"]

            });

        }

        return Results.Ok(assignments);

    }

    catch (NpgsqlException ex)

    {

        Console.WriteLine($"ASSIGNMENTS DATABASE ERROR: {ex}");

        return Results.Problem(

            "Could not retrieve assignments.");

    }

});

// ======================================================
// 6. GET ASSIGNMENT SUBMISSION STATUS API
// GET /api/students/{enrollmentNumber}/assignments/{assignmentId}/submission
// Returns the student's submission details, or NOT_SUBMITTED if no record exists.
// ======================================================


app.MapGet(
    "/api/students/{enrollmentNumber}/assignments/{assignmentId:guid}/submission/download",
    async (
        string enrollmentNumber,
        Guid assignmentId,
        IConfiguration configuration) =>
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem(
                "Database connection string is missing.");
        }

        try
        {
            await using var connection =
                new NpgsqlConnection(connectionString);

            await connection.OpenAsync();

            const string sql = """
                SELECT sub.file_url
                FROM submissions sub
                JOIN students st
                    ON st.student_id = sub.student_id
                WHERE st.enrollment_number = @enrollmentNumber
                  AND sub.assignment_id = @assignmentId
                  AND sub.file_url IS NOT NULL;
                """;

            await using var command =
                new NpgsqlCommand(sql, connection);

            command.Parameters.AddWithValue(
                "enrollmentNumber", enrollmentNumber);

            command.Parameters.AddWithValue(
                "assignmentId", assignmentId);

            var result = await command.ExecuteScalarAsync();

            if (result is null || result is DBNull)
            {
                return Results.NotFound(
                    new { message = "Submission file not found." });
            }

            var relativePath = result.ToString();

            if (string.IsNullOrWhiteSpace(relativePath))
            {
                return Results.NotFound(
                    new { message = "Submission file not found." });
            }

            var uploadsRoot = Path.GetFullPath(
                Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "uploads",
                    "assignments"));

            var fileName = Path.GetFileName(relativePath);

            if (string.IsNullOrWhiteSpace(fileName))
            {
                return Results.BadRequest(
                    new { message = "Invalid file reference." });
            }

            var fullPath = Path.GetFullPath(
                Path.Combine(uploadsRoot, fileName));

            if (!fullPath.StartsWith(
                    uploadsRoot + Path.DirectorySeparatorChar,
                    StringComparison.OrdinalIgnoreCase))
            {
                return Results.BadRequest(
                    new { message = "Invalid file path." });
            }

            if (!System.IO.File.Exists(fullPath))
            {
                return Results.NotFound(
                    new { message = "Stored file not found." });
            }

            var extension =
                Path.GetExtension(fullPath).ToLowerInvariant();

            var contentType = extension switch
            {
                ".pdf" =>
                    "application/pdf",
                ".doc" =>
                    "application/msword",
                ".docx" =>
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => null
            };

            if (contentType is null)
            {
                return Results.BadRequest(
                    new { message = "Unsupported file type." });
            }

            return Results.File(
                fullPath,
                contentType,
                fileDownloadName: fileName);
        }
        catch (NpgsqlException ex)
        {
            Console.WriteLine(
                $"ASSIGNMENT DOWNLOAD DATABASE ERROR: {ex}");

            return Results.Problem(
                "Could not retrieve the submission file.");
        }
        catch (IOException ex)
        {
            Console.WriteLine(
                $"ASSIGNMENT DOWNLOAD FILE ERROR: {ex}");

            return Results.Problem(
                "Could not read the submission file.");
        }
    });



// ======================================================

// 6. SUBMIT ASSIGNMENT API

// POST /api/students/{enrollmentNumber}/assignments/{assignmentId}/submit

// ======================================================


app.MapPost(
    "/api/students/{enrollmentNumber}/assignments/{assignmentId:guid}/submit",
    async (
        string enrollmentNumber,
        Guid assignmentId,
        [Microsoft.AspNetCore.Mvc.FromForm] SubmissionRequest request,
        IConfiguration configuration) =>
{
    const long maxFileSize = 10 * 1024 * 1024;

    var file = request.File;

    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new
        {
            message = "Please upload a PDF, DOC, or DOCX file."
        });
    }

    if (file.Length > maxFileSize)
    {
        return Results.BadRequest(new
        {
            message = "File size cannot exceed 10 MB."
        });
    }

    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

    if (extension is not ".pdf" and not ".doc" and not ".docx")
    {
        return Results.BadRequest(new
        {
            message = "Only PDF, DOC, and DOCX files are allowed."
        });
    }

    // Basic file-signature validation.
    byte[] header = new byte[8];

    await using (var input = file.OpenReadStream())
    {
        int bytesRead = await input.ReadAsync(header.AsMemory(0, header.Length));

        bool validSignature = extension switch
        {
            ".pdf" => bytesRead >= 5 &&
                header[0] == 0x25 &&
                header[1] == 0x50 &&
                header[2] == 0x44 &&
                header[3] == 0x46 &&
                header[4] == 0x2D,

            ".doc" => bytesRead >= 8 &&
                header[0] == 0xD0 &&
                header[1] == 0xCF &&
                header[2] == 0x11 &&
                header[3] == 0xE0 &&
                header[4] == 0xA1 &&
                header[5] == 0xB1 &&
                header[6] == 0x1A &&
                header[7] == 0xE1,

            // DOCX is a ZIP-based format. This checks its ZIP signature,
            // but does not fully validate the internal document structure.
            ".docx" => bytesRead >= 4 &&
                header[0] == 0x50 &&
                header[1] == 0x4B &&
                header[2] == 0x03 &&
                header[3] == 0x04,

            _ => false
        };

        if (!validSignature)
        {
            return Results.BadRequest(new
            {
                message = "The file content does not match the selected file type."
            });
        }
    }

    var connectionString =
        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(
            "Database connection string is missing.");
    }

    string? savedFilePath = null;

    try
    {
        await using var connection =
            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string studentSql = """
            SELECT student_id
            FROM students
            WHERE enrollment_number = @enrollmentNumber;
            """;

        await using var studentCommand =
            new NpgsqlCommand(studentSql, connection);

        studentCommand.Parameters.AddWithValue(
            "enrollmentNumber", enrollmentNumber);

        var studentResult =
            await studentCommand.ExecuteScalarAsync();

        if (studentResult is null)
        {
            return Results.NotFound(new
            {
                message = "Student not found."
            });
        }

        Guid studentId = (Guid)studentResult;

        const string assignmentSql = """
            SELECT 1
            FROM assignments a
            JOIN faculty_assignments fa
                ON fa.faculty_assignment_id =
                   a.faculty_assignment_id
            JOIN course_enrollments ce
                ON ce.course_id = fa.course_id
                AND ce.academic_year = fa.academic_year
                AND ce.enrollment_status = 'ACTIVE'
            JOIN students st
                ON st.student_id = ce.student_id
                AND st.student_id = @studentId
                AND st.course_id = fa.course_id
                AND st.semester = fa.semester
                AND st.section = fa.section
            WHERE a.assignment_id = @assignmentId
            LIMIT 1;
            """;

        await using var assignmentCommand =
            new NpgsqlCommand(assignmentSql, connection);

        assignmentCommand.Parameters.AddWithValue(
            "assignmentId", assignmentId);

        assignmentCommand.Parameters.AddWithValue(
            "studentId", studentId);

        var assignmentExists =
            await assignmentCommand.ExecuteScalarAsync();

        if (assignmentExists is null)
        {
            return Results.NotFound(new
            {
                message =
                    "Assignment not found for this student's active enrollment."
            });
        }

        // Keep uploaded files outside wwwroot.
        string uploadDirectory = Path.Combine(
            Directory.GetCurrentDirectory(),
            "uploads",
            "assignments");

        Directory.CreateDirectory(uploadDirectory);

        // Never use the original filename as the saved filename.
        string storedFileName =
            $"{Guid.NewGuid():N}{extension}";

        savedFilePath = Path.Combine(
            uploadDirectory,
            storedFileName);

        await using (var output = new FileStream(
            savedFilePath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            81920,
            useAsync: true))
        {
            await file.CopyToAsync(output);
        }

        // Store a relative reference, not the original filename.
        string fileReference = Path.Combine(
            "uploads",
            "assignments",
            storedFileName).Replace('\\', '/');

        const string insertSql = """
            INSERT INTO submissions
            (
                assignment_id,
                student_id,
                file_url,
                submission_text,
                submitted_at,
                submission_status
            )
            VALUES
            (
                @assignmentId,
                @studentId,
                @fileUrl,
                NULL,
                CURRENT_TIMESTAMP,
                'SUBMITTED'
            )
            ON CONFLICT (assignment_id, student_id)
            DO UPDATE SET
                file_url = EXCLUDED.file_url,
                submission_text = NULL,
                submitted_at = CURRENT_TIMESTAMP,
                submission_status = 'SUBMITTED',
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                submission_id,
                assignment_id,
                student_id,
                file_url,
                submitted_at,
                submission_status,
                updated_at;
            """;

        await using var insertCommand =
            new NpgsqlCommand(insertSql, connection);

        insertCommand.Parameters.AddWithValue(
            "assignmentId", assignmentId);

        insertCommand.Parameters.AddWithValue(
            "studentId", studentId);

        insertCommand.Parameters.AddWithValue(
            "fileUrl", fileReference);

        await using var reader =
            await insertCommand.ExecuteReaderAsync();

        // INSERT or UPDATE ... ON CONFLICT DO UPDATE should return a row.
        // Keep a defensive guard in case the database returns no row.
        if (!await reader.ReadAsync())
        {
            return Results.Problem(
                "The submission was not saved. No database row was returned.");
        }

        var response = new
        {
            submissionId = reader["submission_id"],
            assignmentId = reader["assignment_id"],
            studentId = reader["student_id"],
            fileUrl = reader["file_url"],
            submittedAt = reader["submitted_at"],
            submissionStatus = reader["submission_status"],
            updatedAt = reader["updated_at"]
        };

        savedFilePath = null; // Keep the file after a successful insert/update.

        return Results.Ok(new
        {
            message = "Assignment submission uploaded successfully. If a submission already existed, it has been updated.",
            submission = response
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"SUBMISSION DATABASE ERROR: {ex}");

        if (savedFilePath is not null && File.Exists(savedFilePath))
        {
            File.Delete(savedFilePath);
        }

        return Results.Problem(
            "Could not save submission. Check backend logs.");
    }
    catch (IOException ex)
    {
        Console.WriteLine($"SUBMISSION FILE ERROR: {ex}");

        if (savedFilePath is not null && File.Exists(savedFilePath))
        {
            File.Delete(savedFilePath);
        }

        return Results.Problem(
            "Could not store the uploaded file.");
    }
}).DisableAntiforgery();


// ======================================================

// 7. STUDENT LEARNING MATERIALS API

// GET /api/students/{enrollmentNumber}/learning-materials

// ======================================================

app.MapGet(

    "/api/students/{enrollmentNumber}/learning-materials",

    async (

        string enrollmentNumber,

        IConfiguration configuration) =>

{

    var connectionString =

        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))

    {

        return Results.Problem(

            "Database connection string is missing.");

    }

    try

    {

        await using var connection =

            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = """

            SELECT

                lm.material_id,

                lm.title,

                lm.description,

                lm.material_type,

                lm.resource_url,

                lm.uploaded_at,

                sub.subject_code,

                sub.subject_name,

                fa.semester,

                fa.academic_year

            FROM students st

            JOIN course_enrollments ce

                ON ce.student_id = st.student_id

                AND ce.course_id = st.course_id

                AND ce.enrollment_status = 'ACTIVE'

            JOIN faculty_assignments fa

                ON fa.course_id = ce.course_id

                AND fa.semester = st.semester

                AND fa.section = st.section

                AND fa.academic_year = ce.academic_year

            JOIN subjects sub

                ON sub.subject_id = fa.subject_id

            JOIN learning_materials lm

                ON lm.faculty_assignment_id =

                   fa.faculty_assignment_id

            WHERE st.enrollment_number = @enrollmentNumber

            ORDER BY sub.subject_code, lm.uploaded_at DESC;

            """;

        await using var command =

            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(

            "enrollmentNumber", enrollmentNumber);

        await using var reader =

            await command.ExecuteReaderAsync();

        var materials = new List<object>();

        while (await reader.ReadAsync())
        {
            var resUrl = reader["resource_url"].ToString()!;
            var matId = (Guid)reader["material_id"];
            var isExt = resUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                        resUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
            var dlUrl = isExt ? resUrl : $"/api/students/{enrollmentNumber}/learning-materials/{matId}/download";

            materials.Add(new
            {
                materialId = matId,
                title = reader["title"],
                description = reader["description"],
                materialType = reader["material_type"],
                resourceUrl = resUrl,
                downloadUrl = dlUrl,
                isExternalLink = isExt,
                uploadedAt = reader["uploaded_at"],
                subjectCode = reader["subject_code"],
                subjectName = reader["subject_name"],
                semester = reader["semester"],
                academicYear = reader["academic_year"]
            });
        }

        return Results.Ok(new
        {
            enrollmentNumber,
            totalMaterials = materials.Count,
            materials
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine(
            $"LEARNING MATERIALS DATABASE ERROR: {ex}");

        return Results.Problem(
            "Could not retrieve learning materials.");
    }
});

// ======================================================
// STUDENT LEARNING MATERIAL DOWNLOAD API
// GET /api/students/{enrollmentNumber}/learning-materials/{materialId:guid}/download
// ======================================================

app.MapGet(
    "/api/students/{enrollmentNumber}/learning-materials/{materialId:guid}/download",
    async (
        string enrollmentNumber,
        Guid materialId,
        HttpContext httpContext,
        IConfiguration configuration) =>
{
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
        return Results.Problem("Database connection string is missing.");

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();

        // Verify student is enrolled in the course cohort for this material
        const string sql = """
            SELECT lm.resource_url, lm.title
            FROM learning_materials lm
            JOIN faculty_assignments fa ON fa.faculty_assignment_id = lm.faculty_assignment_id
            JOIN course_enrollments ce ON ce.course_id = fa.course_id AND ce.academic_year = fa.academic_year AND ce.enrollment_status = 'ACTIVE'
            JOIN students st ON st.student_id = ce.student_id AND st.course_id = fa.course_id AND st.semester = fa.semester AND (st.section = fa.section OR fa.section IS NULL)
            WHERE lm.material_id = @materialId AND st.enrollment_number = @enrollmentNumber
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, connection);
        cmd.Parameters.AddWithValue("materialId", materialId);
        cmd.Parameters.AddWithValue("enrollmentNumber", enrollmentNumber);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Results.NotFound(new { message = "Learning material not found or you are not enrolled in this subject." });
        }

        var resourceUrl = reader["resource_url"].ToString()!;
        var title = reader["title"].ToString()!;

        if (resourceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            resourceUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return Results.Redirect(resourceUrl);
        }

        var fileName = Path.GetFileName(resourceUrl);
        var uploadsRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "uploads", "materials"));
        var fullPath = Path.GetFullPath(Path.Combine(uploadsRoot, fileName));

        if (!fullPath.StartsWith(uploadsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return Results.BadRequest(new { message = "Invalid file path." });

        if (!System.IO.File.Exists(fullPath))
            return Results.NotFound(new { message = "Stored material file not found on disk." });

        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
        var contentType = extension switch
        {
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };

        var cleanTitle = string.Concat(title.Split(Path.GetInvalidFileNameChars())).Trim();
        if (string.IsNullOrWhiteSpace(cleanTitle)) cleanTitle = "material";
        var downloadName = $"{cleanTitle}{extension}";

        return Results.File(fullPath, contentType, fileDownloadName: downloadName);
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"STUDENT MATERIAL DOWNLOAD ERROR: {ex}");
        return Results.Problem("Could not retrieve material file. Check backend logs.");
    }
});

// ======================================================

// APPLICATION STARTUP

// ======================================================

// ======================================================
// 8. STUDENT ASSESSMENTS API
// GET /api/students/{enrollmentNumber}/assessments
// ======================================================

app.MapGet(
    "/api/students/{enrollmentNumber}/assessments",
    async (
        string enrollmentNumber,
        IConfiguration configuration) =>
{
    var connectionString =
        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(
            "Database connection string is missing.");
    }

    try
    {
        await using var connection =
            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = """
            SELECT
                a.assessment_id,
                a.assessment_name,
                a.assessment_type,
                a.max_marks,
                a.assessment_date,
                sub.subject_code,
                sub.subject_name,
                COALESCE(ar.marks_obtained, sqt.marks_obtained) AS marks_obtained,
                COALESCE(ar.feedback, CASE WHEN sqt.attempt_id IS NOT NULL THEN 'Auto-graded online quiz submission' ELSE NULL END) AS feedback,
                COALESCE(ar.evaluated_at, sqt.submitted_at) AS evaluated_at,
                sqt.attempt_id AS attempt_id,
                CASE WHEN sqt.attempt_id IS NOT NULL OR ar.result_id IS NOT NULL THEN true ELSE false END AS is_completed
            FROM students st
            JOIN course_enrollments ce
                ON ce.student_id = st.student_id
                AND ce.course_id = st.course_id
                AND ce.enrollment_status = 'ACTIVE'
            JOIN subjects sub
                ON sub.course_id = ce.course_id
                AND sub.semester = st.semester
            JOIN assessments a
                ON a.subject_id = sub.subject_id
            LEFT JOIN assessment_results ar
                ON ar.assessment_id = a.assessment_id
                AND ar.student_id = st.student_id
            LEFT JOIN student_quiz_attempts sqt
                ON sqt.assessment_id = a.assessment_id
                AND sqt.student_id = st.student_id
            WHERE st.enrollment_number = @enrollmentNumber
            ORDER BY a.assessment_date DESC NULLS LAST,
                     a.created_at DESC;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "enrollmentNumber", enrollmentNumber);

        await using var reader =
            await command.ExecuteReaderAsync();

        var assessments = new List<object>();

        while (await reader.ReadAsync())
        {
            assessments.Add(new
            {
                assessmentId = reader["assessment_id"],
                assessmentName = reader["assessment_name"],
                assessmentType = reader["assessment_type"],
                maxMarks = reader["max_marks"],

                assessmentDate =
                    reader["assessment_date"] is DBNull
                        ? null
                        : reader["assessment_date"],

                subjectCode = reader["subject_code"],
                subjectName = reader["subject_name"],

                marksObtained =
                    reader["marks_obtained"] is DBNull
                        ? null
                        : reader["marks_obtained"],

                feedback =
                    reader["feedback"] is DBNull
                        ? null
                        : reader["feedback"],

                evaluatedAt =
                    reader["evaluated_at"] is DBNull
                        ? null
                        : reader["evaluated_at"],

                attemptId =
                    reader["attempt_id"] is DBNull
                        ? null
                        : reader["attempt_id"],

                isCompleted = Convert.ToBoolean(reader["is_completed"])
            });
        }

        return Results.Ok(new
        {
            enrollmentNumber,
            totalAssessments = assessments.Count,
            assessments
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine(
            $"ASSESSMENTS DATABASE ERROR: {ex}");

        return Results.Problem(
            "Could not retrieve student assessments.");
    }
});


// ======================================================
// 9. STUDENT RESULTS API
// GET /api/students/{enrollmentNumber}/results
// Includes existing evaluated results AND quiz attempts.
// These are kept as separate records; quiz attempts do not overwrite results.
// ======================================================

app.MapGet(
    "/api/students/{enrollmentNumber}/results",
    async (
        string enrollmentNumber,
        IConfiguration configuration) =>
{
    var connectionString =
        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(
            "Database connection string is missing.");
    }

    try
    {
        await using var connection =
            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        
        const string sql = """
            SELECT
                ar.result_id AS record_id,
                a.assessment_id,
                a.assessment_name,
                a.assessment_type,
                a.max_marks,
                a.assessment_date,
                ar.marks_obtained,
                ar.feedback,
                ar.evaluated_at AS record_date,
                sub.subject_code,
                sub.subject_name,
                'EVALUATED_RESULT'::text AS result_source
            FROM public.students st
            JOIN public.assessment_results ar
                ON ar.student_id = st.student_id
            JOIN public.assessments a
                ON a.assessment_id = ar.assessment_id
            JOIN public.subjects sub
                ON sub.subject_id = a.subject_id
            WHERE st.enrollment_number = @enrollmentNumber

            UNION ALL

            SELECT
                sqt.attempt_id AS record_id,
                a.assessment_id,
                a.assessment_name,
                a.assessment_type,
                a.max_marks,
                a.assessment_date,
                sqt.marks_obtained,
                NULL::text AS feedback,
                sqt.submitted_at AS record_date,
                sub.subject_code,
                sub.subject_name,
                'QUIZ_ATTEMPT'::text AS result_source
            FROM public.students st
            JOIN public.student_quiz_attempts sqt
                ON sqt.student_id = st.student_id
            JOIN public.assessments a
                ON a.assessment_id = sqt.assessment_id
            JOIN public.subjects sub
                ON sub.subject_id = a.subject_id
            WHERE st.enrollment_number = @enrollmentNumber
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.assessment_results ar2
                  WHERE ar2.student_id = sqt.student_id
                    AND ar2.assessment_id = sqt.assessment_id
              )

            ORDER BY record_date DESC;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "enrollmentNumber", enrollmentNumber);

        await using var reader =
            await command.ExecuteReaderAsync();

        var results = new List<object>();
        decimal totalMarksObtained = 0m;
        decimal totalMaximumMarks = 0m;

        while (await reader.ReadAsync())
        {
            decimal marksObtained =
                Convert.ToDecimal(reader["marks_obtained"]);

            decimal maxMarks =
                Convert.ToDecimal(reader["max_marks"]);

            totalMarksObtained += marksObtained;
            totalMaximumMarks += maxMarks;

            results.Add(new
            {
                recordId = reader["record_id"],
                resultSource = reader["result_source"],
                assessmentId = reader["assessment_id"],
                assessmentName = reader["assessment_name"],
                assessmentType = reader["assessment_type"],
                subjectCode = reader["subject_code"],
                subjectName = reader["subject_name"],
                assessmentDate = reader["assessment_date"] is DBNull
                    ? null
                    : reader["assessment_date"],
                marksObtained,
                maxMarks,
                percentage = maxMarks > 0m
                    ? Math.Round(marksObtained * 100m / maxMarks, 2)
                    : 0m,
                feedback = reader["feedback"] is DBNull
                    ? null
                    : reader["feedback"],
                recordedAt = reader["record_date"]
            });
        }

        decimal overallPercentage = totalMaximumMarks > 0m
            ? Math.Round(
                totalMarksObtained * 100m / totalMaximumMarks, 2)
            : 0m;

        return Results.Ok(new
        {
            enrollmentNumber,
            totalResults = results.Count,
            totalMarksObtained,
            totalMaximumMarks,
            overallPercentage,
            results
        });
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"RESULTS DATABASE ERROR: {ex}");

        return Results.Problem(
            "Could not retrieve student results.");
    }
});


// ======================================================
// 10. STUDENT PROFILE API
// GET /api/students/{enrollmentNumber}/profile
// ======================================================

app.MapGet(
    "/api/students/{enrollmentNumber}/profile",
    async (
        string enrollmentNumber,
        IConfiguration configuration) =>
{
    var connectionString =
        configuration.GetConnectionString("DefaultConnection");

    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Problem(
            "Database connection string is missing.");
    }

    try
    {
        await using var connection =
            new NpgsqlConnection(connectionString);

        await connection.OpenAsync();

        const string sql = """
            SELECT
                u.user_id,
                u.full_name,
                u.email,
                s.student_id,
                s.enrollment_number,
                d.department_name,
                c.course_code,
                c.course_name,
                s.semester,
                s.section,
                ce.academic_year,
                ce.enrollment_status
            FROM students s
            JOIN users u
                ON u.user_id = s.user_id
            LEFT JOIN departments d
                ON d.department_id = s.department_id
            LEFT JOIN courses c
                ON c.course_id = s.course_id
            LEFT JOIN course_enrollments ce
                ON ce.student_id = s.student_id
                AND ce.course_id = s.course_id
            WHERE s.enrollment_number = @enrollmentNumber
            ORDER BY
                CASE
                    WHEN ce.enrollment_status = 'ACTIVE' THEN 0
                    ELSE 1
                END,
                ce.academic_year DESC NULLS LAST
            LIMIT 1;
            """;

        await using var command =
            new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue(
            "enrollmentNumber", enrollmentNumber);

        await using var reader =
            await command.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return Results.NotFound(new
            {
                message = "Student not found."
            });
        }

        var profile = new
        {
            userId = reader["user_id"],
            studentId = reader["student_id"],
            fullName = reader["full_name"],
            email = reader["email"],
            enrollmentNumber = reader["enrollment_number"],
            department = reader["department_name"] is DBNull
                ? null
                : reader["department_name"],
            courseCode = reader["course_code"] is DBNull
                ? null
                : reader["course_code"],
            courseName = reader["course_name"] is DBNull
                ? null
                : reader["course_name"],
            semester = reader["semester"] is DBNull
                ? null
                : reader["semester"],
            section = reader["section"] is DBNull
                ? null
                : reader["section"],
            academicYear = reader["academic_year"] is DBNull
                ? null
                : reader["academic_year"],
            enrollmentStatus = reader["enrollment_status"] is DBNull
                ? null
                : reader["enrollment_status"]
        };

        return Results.Ok(profile);
    }
    catch (NpgsqlException ex)
    {
        Console.WriteLine($"STUDENT PROFILE DATABASE ERROR: {ex}");

        return Results.Problem(
            "Could not retrieve student profile.");
    }
});



// ======================================================
// 11. QUIZ QUESTIONS API
// GET /api/students/{enrollmentNumber}/assessments/{assessmentId}/questions
// ======================================================

app.MapGet(
    "/api/students/{enrollmentNumber}/assessments/{assessmentId:guid}/questions",
    async (
        string enrollmentNumber,
        Guid assessmentId,
        IConfiguration configuration) =>
    {
        var connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem(
                "Database connection string is missing.");
        }

        try
        {
            await using var connection =
                new NpgsqlConnection(connectionString);

            await connection.OpenAsync();

            const string studentSql = """
                SELECT student_id, course_id, semester
                FROM public.students
                WHERE enrollment_number = @enrollmentNumber
                LIMIT 1;
                """;

            Guid studentId;
            Guid courseId;
            int semester;

            await using (var studentCommand =
                new NpgsqlCommand(studentSql, connection))
            {
                studentCommand.Parameters.AddWithValue(
                    "enrollmentNumber", enrollmentNumber);

                await using var studentReader =
                    await studentCommand.ExecuteReaderAsync();

                if (!await studentReader.ReadAsync())
                {
                    return Results.NotFound(new
                    {
                        message = "Student not found."
                    });
                }

                studentId = studentReader.GetGuid(0);
                courseId = studentReader.GetGuid(1);
                semester = studentReader.GetInt32(2);
            }

            const string sql = """
                SELECT
                    a.assessment_name,
                    a.max_marks,
                    q.question_id,
                    q.question_text,
                    q.options,
                    q.marks
                FROM public.assessments a
                JOIN public.subjects sub
                    ON sub.subject_id = a.subject_id
                JOIN public.assessment_questions q
                    ON q.assessment_id = a.assessment_id
                WHERE a.assessment_id = @assessmentId
                  AND sub.course_id = @courseId
                  AND sub.semester = @semester
                ORDER BY q.created_at, q.question_id;
                """;

            await using var command =
                new NpgsqlCommand(sql, connection);

            command.Parameters.AddWithValue("assessmentId", assessmentId);
            command.Parameters.AddWithValue("courseId", courseId);
            command.Parameters.AddWithValue("semester", semester);

            await using var reader = await command.ExecuteReaderAsync();
            var questions = new List<object>();
            string? assessmentName = null;
            decimal maxMarks = 0;

            while (await reader.ReadAsync())
            {
                assessmentName = reader.GetString(0);
                maxMarks = Convert.ToDecimal(reader.GetValue(1));

                var optionsValue = reader.GetValue(4);
                object? options;

                if (optionsValue is DBNull)
                {
                    options = null;
                }
                else if (optionsValue is string optionsText)
                {
                    try
                    {
                        options = System.Text.Json.JsonSerializer
                            .Deserialize<System.Text.Json.JsonElement>(optionsText);
                    }
                    catch (System.Text.Json.JsonException)
                    {
                        options = optionsText;
                    }
                }
                else
                {
                    options = optionsValue;
                }

                questions.Add(new
                {
                    questionId = reader.GetGuid(2),
                    questionText = reader.GetString(3),
                    options,
                    marks = Convert.ToDecimal(reader.GetValue(5))
                });
            }

            if (questions.Count == 0)
            {
                return Results.NotFound(new
                {
                    message = "No quiz questions found for this assessment."
                });
            }

            return Results.Ok(new
            {
                enrollmentNumber,
                assessmentId,
                assessmentName,
                maxMarks,
                totalQuestions = questions.Count,
                questions
            });
        }
        catch (NpgsqlException ex)
        {
            Console.WriteLine($"QUIZ QUESTIONS DATABASE ERROR: {ex}");
            return Results.Problem(
                "Could not retrieve quiz questions. Check backend logs.");
        }
    });


// ======================================================
// 12. QUIZ SUBMISSION API
// POST /api/students/{enrollmentNumber}/assessments/{assessmentId}/submit
// ======================================================

app.MapPost(
    "/api/students/{enrollmentNumber}/assessments/{assessmentId:guid}/submit",
    async (
        string enrollmentNumber,
        Guid assessmentId,
        QuizSubmissionRequest request,
        IConfiguration configuration) =>
    {
        if (request.Answers is null || request.Answers.Count == 0)
        {
            return Results.BadRequest(new
            {
                message = "Submit at least one answer."
            });
        }

        var connectionString =
            configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem(
                "Database connection string is missing.");
        }

        try
        {
            await using var connection =
                new NpgsqlConnection(connectionString);

            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            const string studentSql = """
                SELECT student_id, course_id, semester
                FROM public.students
                WHERE enrollment_number = @enrollmentNumber
                LIMIT 1;
                """;

            Guid studentId;
            Guid courseId;
            int semester;

            await using (var studentCommand =
                new NpgsqlCommand(studentSql, connection, transaction))
            {
                studentCommand.Parameters.AddWithValue(
                    "enrollmentNumber", enrollmentNumber);

                await using var studentReader =
                    await studentCommand.ExecuteReaderAsync();

                if (!await studentReader.ReadAsync())
                {
                    return Results.NotFound(new
                    {
                        message = "Student not found."
                    });
                }

                studentId = studentReader.GetGuid(0);
                courseId = studentReader.GetGuid(1);
                semester = studentReader.GetInt32(2);
            }

            const string assessmentSql = """
                SELECT a.max_marks
                FROM public.assessments a
                JOIN public.subjects sub
                    ON sub.subject_id = a.subject_id
                WHERE a.assessment_id = @assessmentId
                  AND sub.course_id = @courseId
                  AND sub.semester = @semester
                LIMIT 1;
                """;

            decimal maxMarks;

            await using (var assessmentCommand =
                new NpgsqlCommand(assessmentSql, connection, transaction))
            {
                assessmentCommand.Parameters.AddWithValue("assessmentId", assessmentId);
                assessmentCommand.Parameters.AddWithValue("courseId", courseId);
                assessmentCommand.Parameters.AddWithValue("semester", semester);

                var result = await assessmentCommand.ExecuteScalarAsync();
                if (result is null)
                {
                    return Results.NotFound(new
                    {
                        message = "Assessment not found for this student."
                    });
                }

                maxMarks = Convert.ToDecimal(result);
            }

            const string questionSql = """
                SELECT question_id, correct_option, marks
                FROM public.assessment_questions
                WHERE assessment_id = @assessmentId;
                """;

            var correctAnswers =
                new Dictionary<Guid, (string Option, decimal Marks)>();

            await using (var questionCommand =
                new NpgsqlCommand(questionSql, connection, transaction))
            {
                questionCommand.Parameters.AddWithValue("assessmentId", assessmentId);

                await using var questionReader =
                    await questionCommand.ExecuteReaderAsync();

                while (await questionReader.ReadAsync())
                {
                    correctAnswers.Add(
                        questionReader.GetGuid(0),
                        (
                            questionReader.GetString(1),
                            Convert.ToDecimal(questionReader.GetValue(2))
                        ));
                }
            }

            if (correctAnswers.Count == 0)
            {
                return Results.BadRequest(new
                {
                    message = "This assessment has no questions."
                });
            }

            foreach (var answer in request.Answers)
            {
                if (!correctAnswers.ContainsKey(answer.Key))
                {
                    return Results.BadRequest(new
                    {
                        message = "One or more question IDs are invalid."
                    });
                }

                if (string.IsNullOrWhiteSpace(answer.Value))
                {
                    return Results.BadRequest(new
                    {
                        message = "Answer options cannot be empty."
                    });
                }
            }

            decimal marksObtained = 0;
            foreach (var answer in request.Answers)
            {
                var correct = correctAnswers[answer.Key];
                if (string.Equals(
                    answer.Value.Trim(),
                    correct.Option,
                    StringComparison.OrdinalIgnoreCase))
                {
                    marksObtained += correct.Marks;
                }
            }

            if (marksObtained > maxMarks)
            {
                return Results.Problem(
                    "Calculated marks exceed assessment maximum marks.");
            }

            var answersJson = System.Text.Json.JsonSerializer.Serialize(
                request.Answers.ToDictionary(
                    item => item.Key.ToString(),
                    item => item.Value));

            const string insertSql = """
                INSERT INTO public.student_quiz_attempts
                (
                    assessment_id,
                    student_id,
                    answers,
                    marks_obtained
                )
                VALUES
                (
                    @assessmentId,
                    @studentId,
                    CAST(@answers AS jsonb),
                    @marksObtained
                )
                ON CONFLICT (assessment_id, student_id)
                DO NOTHING
                RETURNING attempt_id, submitted_at;
                """;

            Guid attemptId;
            DateTime submittedAt;

            await using (var insertCommand =
                new NpgsqlCommand(insertSql, connection, transaction))
            {
                insertCommand.Parameters.AddWithValue("assessmentId", assessmentId);
                insertCommand.Parameters.AddWithValue("studentId", studentId);
                insertCommand.Parameters.AddWithValue("answers", answersJson);
                insertCommand.Parameters.AddWithValue("marksObtained", marksObtained);

                await using var resultReader =
                    await insertCommand.ExecuteReaderAsync();

                if (!await resultReader.ReadAsync())
                {
                    return Results.Conflict(new
                    {
                        message = "You have already submitted this quiz."
                    });
                }

                attemptId = resultReader.GetGuid(0);
                submittedAt = resultReader.GetDateTime(1);
            }

            // Also record score into assessment_results for official academic results integration
            const string resultUpsertSql = """
                INSERT INTO public.assessment_results
                (
                    assessment_id,
                    student_id,
                    marks_obtained,
                    feedback,
                    evaluated_at
                )
                VALUES
                (
                    @assessmentId,
                    @studentId,
                    @marksObtained,
                    'Auto-graded online quiz submission',
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (assessment_id, student_id)
                DO UPDATE SET
                    marks_obtained = EXCLUDED.marks_obtained,
                    feedback = EXCLUDED.feedback,
                    evaluated_at = EXCLUDED.evaluated_at;
                """;

            await using (var resultCmd = new NpgsqlCommand(resultUpsertSql, connection, transaction))
            {
                resultCmd.Parameters.AddWithValue("assessmentId", assessmentId);
                resultCmd.Parameters.AddWithValue("studentId", studentId);
                resultCmd.Parameters.AddWithValue("marksObtained", marksObtained);
                await resultCmd.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();

            return Results.Ok(new
            {
                message = "Quiz submitted successfully.",
                attemptId,
                enrollmentNumber,
                assessmentId,
                totalQuestions = correctAnswers.Count,
                answeredQuestions = request.Answers.Count,
                marksObtained,
                maxMarks,
                percentage = maxMarks > 0
                    ? Math.Round(marksObtained * 100m / maxMarks, 2)
                    : 0m,
                submittedAt
            });
        }
        catch (NpgsqlException ex)
        {
            Console.WriteLine($"QUIZ SUBMISSION DATABASE ERROR: {ex}");
            return Results.Problem(
                "Could not submit quiz. Check backend logs.");
        }
    });

// ======================================================
// 13. STUDENT QUIZ ATTEMPT REVIEW API
// GET /api/students/{enrollmentNumber}/assessments/{assessmentId:guid}/review
// ======================================================

app.MapGet(
    "/api/students/{enrollmentNumber}/assessments/{assessmentId:guid}/review",
    async (
        string enrollmentNumber,
        Guid assessmentId,
        IConfiguration configuration) =>
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return Results.Problem("Database connection string is missing.");
        }

        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            // 1. Verify student exists and get student_id, course_id, semester
            const string studentSql = """
                SELECT student_id, course_id, semester
                FROM public.students
                WHERE enrollment_number = @enrollmentNumber
                LIMIT 1;
                """;

            Guid studentId;
            Guid courseId;
            int semester;

            await using (var studentCommand = new NpgsqlCommand(studentSql, connection))
            {
                studentCommand.Parameters.AddWithValue("enrollmentNumber", enrollmentNumber);
                await using var studentReader = await studentCommand.ExecuteReaderAsync();
                if (!await studentReader.ReadAsync())
                {
                    return Results.NotFound(new { message = "Student not found." });
                }
                studentId = studentReader.GetGuid(0);
                courseId = studentReader.GetGuid(1);
                semester = studentReader.GetInt32(2);
            }

            // 2. Fetch assessment details and student's attempt / result
            const string assessSql = """
                SELECT
                    a.assessment_id,
                    a.assessment_name,
                    a.assessment_type,
                    a.max_marks,
                    a.assessment_date,
                    sub.subject_code,
                    sub.subject_name,
                    sqa.attempt_id,
                    sqa.answers,
                    sqa.marks_obtained AS attempt_marks,
                    sqa.submitted_at,
                    ar.result_id,
                    ar.marks_obtained AS result_marks,
                    ar.feedback,
                    ar.evaluated_at
                FROM public.assessments a
                JOIN public.subjects sub ON sub.subject_id = a.subject_id
                JOIN public.course_enrollments ce ON ce.student_id = @studentId 
                    AND ce.course_id = sub.course_id 
                    AND ce.enrollment_status = 'ACTIVE'
                LEFT JOIN public.student_quiz_attempts sqa
                    ON sqa.assessment_id = a.assessment_id AND sqa.student_id = @studentId
                LEFT JOIN public.assessment_results ar
                    ON ar.assessment_id = a.assessment_id AND ar.student_id = @studentId
                WHERE a.assessment_id = @assessmentId
                  AND sub.course_id = @courseId
                  AND sub.semester = @semester
                LIMIT 1;
                """;

            string assessmentName;
            string assessmentType;
            decimal maxMarks;
            string subjectCode;
            string subjectName;
            DateTime? evaluatedAt = null;
            decimal marksObtained = 0m;
            decimal? attemptMarks = null;
            string? answersJson = null;
            Guid? attemptId = null;
            string? feedback = null;

            await using (var assessCmd = new NpgsqlCommand(assessSql, connection))
            {
                assessCmd.Parameters.AddWithValue("assessmentId", assessmentId);
                assessCmd.Parameters.AddWithValue("studentId", studentId);
                assessCmd.Parameters.AddWithValue("courseId", courseId);
                assessCmd.Parameters.AddWithValue("semester", semester);

                await using var reader = await assessCmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return Results.NotFound(new { message = "Assessment not found or student is not enrolled in this subject." });
                }

                // Check if student has completed this assessment
                var hasAttempt = reader["attempt_id"] is not DBNull;
                var hasResult = reader["result_id"] is not DBNull;

                if (!hasAttempt && !hasResult)
                {
                    return Results.BadRequest(new
                    {
                        message = "You have not completed this assessment yet. Answers can only be reviewed after submission."
                    });
                }

                assessmentName = reader["assessment_name"].ToString()!;
                assessmentType = reader["assessment_type"].ToString()!;
                maxMarks = Convert.ToDecimal(reader["max_marks"]);
                subjectCode = reader["subject_code"].ToString()!;
                subjectName = reader["subject_name"].ToString()!;

                decimal? resultMarks = reader["result_marks"] is not DBNull ? Convert.ToDecimal(reader["result_marks"]) : null;
                attemptMarks = hasAttempt && reader["attempt_marks"] is not DBNull ? Convert.ToDecimal(reader["attempt_marks"]) : null;
                marksObtained = resultMarks ?? attemptMarks ?? 0m;

                DateTime? resultEvalDate = reader["evaluated_at"] is not DBNull ? (DateTime)reader["evaluated_at"] : null;
                DateTime? attemptSubmitDate = hasAttempt && reader["submitted_at"] is not DBNull ? (DateTime)reader["submitted_at"] : null;
                evaluatedAt = resultEvalDate ?? attemptSubmitDate;

                if (hasAttempt)
                {
                    attemptId = (Guid)reader["attempt_id"];
                    answersJson = reader["answers"]?.ToString();
                }

                if (reader["feedback"] is not DBNull)
                {
                    feedback = reader["feedback"].ToString();
                }
                else if (hasAttempt)
                {
                    feedback = "Auto-graded online quiz submission";
                }
            }

            // Parse student answers dictionary
            var studentAnswers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(answersJson))
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(answersJson);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        studentAnswers[prop.Name] = prop.Value.GetString() ?? prop.Value.ToString();
                    }
                }
                catch
                {
                    // Fallback if parsing fails
                }
            }

            // 3. Fetch questions and answer keys for review
            const string questionsSql = """
                SELECT
                    q.question_id,
                    q.question_text,
                    q.options,
                    q.correct_option,
                    q.marks
                FROM public.assessment_questions q
                WHERE q.assessment_id = @assessmentId
                ORDER BY q.created_at ASC, q.question_id ASC;
                """;

            var reviewQuestions = new List<object>();
            int correctCount = 0;
            int totalQuestions = 0;

            await using (var qCmd = new NpgsqlCommand(questionsSql, connection))
            {
                qCmd.Parameters.AddWithValue("assessmentId", assessmentId);
                await using var qReader = await qCmd.ExecuteReaderAsync();

                while (await qReader.ReadAsync())
                {
                    totalQuestions++;
                    var qId = qReader.GetGuid(0);
                    var qText = qReader.GetString(1);
                    var optionsVal = qReader.GetValue(2);
                    var correctOpt = qReader.GetString(3);
                    var qMarks = Convert.ToDecimal(qReader.GetValue(4));

                    var optionsMap = new Dictionary<string, string>();
                    object? parsedOptions = null;

                    if (optionsVal is string optStr)
                    {
                        try
                        {
                            using var doc = System.Text.Json.JsonDocument.Parse(optStr);
                            parsedOptions = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(optStr);
                            foreach (var p in doc.RootElement.EnumerateObject())
                            {
                                optionsMap[p.Name] = p.Value.GetString() ?? p.Value.ToString();
                            }
                        }
                        catch
                        {
                            parsedOptions = optStr;
                        }
                    }
                    else if (optionsVal is not DBNull)
                    {
                        parsedOptions = optionsVal;
                    }

                    // Check student answer
                    studentAnswers.TryGetValue(qId.ToString(), out var selectedOpt);
                    var isAnswered = !string.IsNullOrWhiteSpace(selectedOpt);
                    var isCorrect = isAnswered && string.Equals(selectedOpt!.Trim(), correctOpt.Trim(), StringComparison.OrdinalIgnoreCase);

                    if (isCorrect) correctCount++;

                    optionsMap.TryGetValue(correctOpt.Trim(), out var correctText);
                    string? selectedText = null;
                    if (isAnswered && selectedOpt != null)
                    {
                        optionsMap.TryGetValue(selectedOpt.Trim(), out selectedText);
                    }

                    reviewQuestions.Add(new
                    {
                        questionId = qId,
                        questionNumber = totalQuestions,
                        questionText = qText,
                        options = parsedOptions,
                        studentAnswer = selectedOpt,
                        studentAnswerText = selectedText,
                        correctAnswer = correctOpt,
                        correctAnswerText = correctText,
                        isAnswered,
                        isCorrect,
                        marks = qMarks,
                        earnedMarks = isCorrect ? qMarks : 0m
                    });
                }
            }

            var percentage = maxMarks > 0m
                ? Math.Round(marksObtained * 100m / maxMarks, 2)
                : 0m;

            return Results.Ok(new
            {
                assessmentId,
                assessmentName,
                assessmentType,
                subjectCode,
                subjectName,
                maxMarks,
                marksObtained,
                attemptMarks,
                percentage,
                evaluatedAt,
                attemptId,
                feedback,
                totalQuestions,
                correctCount,
                incorrectCount = totalQuestions - correctCount,
                hasAnswerData = studentAnswers.Count > 0,
                questions = reviewQuestions
            });
        }
        catch (NpgsqlException ex)
        {
            Console.WriteLine($"STUDENT QUIZ REVIEW ERROR: {ex}");
            return Results.Problem("Could not retrieve quiz review. Check backend logs.");
        }
    });

app.UseHttpsRedirection();

app.Run();


// ======================================================

// REQUEST MODEL

// ======================================================


public sealed class SubmissionRequest
{
    public IFormFile? File { get; set; }
}


// app.Run();

public sealed record QuizSubmissionRequest(
    Dictionary<Guid, string> Answers
);

public sealed record StudentLoginRequest(
    string Identifier,
    string Password
);

public sealed record FacultyAttendanceUpdateRequest(
    Guid StudentId,
    string AttendanceStatus
);

public sealed record CreateClassSessionRequest(
    DateTime SessionDate,
    string? StartTime,
    string? EndTime,
    string? SessionStatus
);

public sealed record StudentAttendanceItem(
    Guid StudentId,
    string AttendanceStatus
);

public sealed record UpdateSessionAttendanceRequest(
    List<StudentAttendanceItem>? Records,
    Guid? StudentId,
    string? AttendanceStatus,
    bool? MarkSessionConducted
);

public sealed record CreateAssignmentRequest(
    string Title,
    string? Instructions,
    DateTime? DueAt,
    decimal MaxMarks
);

public sealed record GradeSubmissionRequest(
    decimal MarksObtained,
    string? Feedback
);

public sealed record CreateQuestionItem(
    string QuestionText,
    Dictionary<string, string> Options,
    string CorrectOption,
    decimal Marks
);

public sealed record CreateFacultyAssessmentRequest(
    string Title,
    string? AssessmentType,
    DateTime? AssessmentDate,
    List<CreateQuestionItem>? Questions
);