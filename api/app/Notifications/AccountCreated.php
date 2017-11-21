<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

use App\User;

class AccountCreated extends Notification
{
    private $user;
    private $url_verification;

    public function __construct(User $user, $url_verification) {
        $this->user = $user;
        $this->url_verification = $url_verification;
    }

    public function via($notifiable) {
        return ['mail'];
    }

    public function toMail($notifiable) {
        return (new MailMessage())
            ->subject('Your account was created.')
            ->greeting("Hi {$this->user->name},")
            ->line('Your account was created.')
            ->action('Please visit this address to validate it', $this->url_verification)
            ->line('Thanks for using our app.')
            ->salutation('Best regards,');
    }
}
