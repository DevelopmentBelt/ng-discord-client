<?php

namespace App\Services;

class MailService
{
  /**
   * Deliver a password-reset email.
   * MAIL_DRIVER=log (default) writes to storage and returns false for "sent via SMTP".
   * MAIL_DRIVER=mail uses PHP mail().
   */
  public static function sendPasswordReset(string $toEmail, string $resetUrl): bool
  {
    $subject = 'Reset your Angcord password';
    $body = "Hi,\n\n"
      . "We received a request to reset your Angcord password.\n"
      . "Open this link to choose a new password (expires in 1 hour):\n\n"
      . $resetUrl . "\n\n"
      . "If you did not request this, you can ignore this email.\n";

    self::logMessage($toEmail, $subject, $body, $resetUrl);

    $driver = strtolower((string) ($_ENV['MAIL_DRIVER'] ?? getenv('MAIL_DRIVER') ?: 'log'));
    if ($driver !== 'mail') {
      return false;
    }

    $from = (string) ($_ENV['MAIL_FROM'] ?? getenv('MAIL_FROM') ?: 'noreply@angcord.local');
    $headers = [
      'From: ' . $from,
      'Reply-To: ' . $from,
      'Content-Type: text/plain; charset=UTF-8',
      'X-Mailer: PHP/' . phpversion(),
    ];

    return @mail($toEmail, $subject, $body, implode("\r\n", $headers));
  }

  public static function isLogDriver(): bool
  {
    $driver = strtolower((string) ($_ENV['MAIL_DRIVER'] ?? getenv('MAIL_DRIVER') ?: 'log'));
    return $driver !== 'mail';
  }

  private static function logMessage(string $to, string $subject, string $body, string $resetUrl): void
  {
    $dir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'storage';
    if (!is_dir($dir)) {
      @mkdir($dir, 0775, true);
    }
    $line = sprintf(
      "[%s] to=%s subject=%s resetUrl=%s\n%s\n---\n",
      date('c'),
      $to,
      $subject,
      $resetUrl,
      $body
    );
    @file_put_contents($dir . DIRECTORY_SEPARATOR . 'password-resets.log', $line, FILE_APPEND);
  }
}
