
using System;
using System.Security.Cryptography;

Console.Write("Enter a new faculty password: ");
string? password = ReadPassword();

if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
{
    Console.WriteLine("\nPassword must contain at least 12 characters.");
    return;
}

byte[] salt = RandomNumberGenerator.GetBytes(16);

byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
    password,
    salt,
    100_000,
    HashAlgorithmName.SHA256,
    32
);

string storedHash =
    $"pbkdf2$100000${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";

Console.WriteLine("\nPassword hash generated successfully:");
Console.WriteLine(storedHash);

static string ReadPassword()
{
    string password = "";
    ConsoleKeyInfo key;

    while ((key = Console.ReadKey(intercept: true)).Key != ConsoleKey.Enter)
    {
        if (key.Key == ConsoleKey.Backspace)
        {
            if (password.Length > 0)
                password = password[..^1];
        }
        else if (!char.IsControl(key.KeyChar))
        {
            password += key.KeyChar;
        }
    }

    Console.WriteLine();
    return password;
}
