export interface Article {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  excerpt: string;
  content: string;
  tags: string[];
  relatedArticles?: string[]; // IDs of related articles
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon name
  description: string;
}

export const HELP_CATEGORIES: Category[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    slug: 'getting-started',
    icon: 'Rocket',
    description: 'New to EventTicket? Start here'
  },
  {
    id: 'tickets-booking',
    name: 'Tickets & Booking',
    slug: 'tickets-booking',
    icon: 'Ticket',
    description: 'Everything about purchasing tickets'
  },
  {
    id: 'account-security',
    name: 'Account & Security',
    slug: 'account-security',
    icon: 'Shield',
    description: 'Manage your account and stay secure'
  },
  {
    id: 'events',
    name: 'Events',
    slug: 'events',
    icon: 'Calendar',
    description: 'Finding and attending events'
  },
  {
    id: 'payment-refunds',
    name: 'Payment & Refunds',
    slug: 'payment-refunds',
    icon: 'CreditCard',
    description: 'Payment methods and refund policy'
  }
];

export const HELP_ARTICLES: Article[] = [
  // Getting Started
  {
    id: 'create-account',
    title: 'Creating Your Account',
    slug: 'creating-your-account',
    categoryId: 'getting-started',
    excerpt: 'Learn how to sign up and set up your EventTicket account in minutes.',
    content: `# Creating Your Account

Welcome to EventTicket! Setting up your account is quick and easy.

## Step 1: Sign Up

1. Click the **Sign Up** button in the top navigation
2. Enter your full name, email address, and create a strong password
3. Agree to our Terms of Service and Privacy Policy
4. Click **Create Account**

## Step 2: Verify Your Email

We'll send a verification email to the address you provided. Click the verification link to activate your account.

## Step 3: Complete Your Profile

Add additional information:
- Profile photo (optional)
- Phone number for ticket notifications
- Payment preferences

## Tips

- Use a strong, unique password
- Enable two-factor authentication for extra security
- Keep your email up-to-date for ticket delivery

Need help? Contact our support team at support@eventticket.com`,
    tags: ['account', 'signup', 'registration', 'new user']
  },
  {
    id: 'buying-first-ticket',
    title: 'Buying Your First Ticket',
    slug: 'buying-your-first-ticket',
    categoryId: 'getting-started',
    excerpt: 'Step-by-step guide to purchasing your first event ticket.',
    content: `# Buying Your First Ticket

Ready to attend your first event? Here's how to purchase tickets.

## Step 1: Browse Events

- Visit the **Events** page from the navigation menu
- Use filters to find events by genre, date, or location
- Click on an event to view details

## Step 2: Select Tickets

1. Choose your ticket tier (VIP, Premium, Standard, or Economy)
2. Select seats from the interactive seat map
3. Review pricing and availability

## Step 3: Checkout

1. Review your order summary
2. Enter your contact details
3. Choose payment method (Credit Card, Bank Transfer, or E-Wallet)
4. Complete payment

## Step 4: Receive Your Tickets

- Digital tickets are sent instantly to your email
- Access tickets from **Dashboard > My Tickets**
- QR codes are generated for event entry

## Important Notes

- Tickets are non-transferable unless stated otherwise
- Bring valid ID matching the ticket holder name
- Arrive early for smoother entry`,
    tags: ['tickets', 'purchase', 'first time', 'checkout'],
    relatedArticles: ['select-seats', 'payment-methods']
  },
  {
    id: 'navigate-platform',
    title: 'Navigating the Platform',
    slug: 'navigating-the-platform',
    categoryId: 'getting-started',
    excerpt: 'Overview of the EventTicket interface and main features.',
    content: `# Navigating the Platform

Get familiar with the EventTicket interface.

## Main Navigation

- **Home**: Featured events and upcoming tours
- **Events**: Browse all available events
- **Lineup**: View artist lineup and tour schedules
- **Dashboard**: Your tickets, orders, and account settings

## Dashboard Overview

Your personal hub includes:
- **My Tickets**: All purchased tickets with QR codes
- **Orders**: Purchase history and order status
- **Profile**: Update personal information
- **Settings**: Notification preferences and security

## Search & Filters

- Use the search bar to find specific events or artists
- Filter by genre, date, location, or price range
- Sort results by date or price

## Mobile App

Access EventTicket on mobile:
- Responsive design works on all devices
- Save tickets for offline viewing
- Push notifications for event reminders`,
    tags: ['navigation', 'interface', 'dashboard', 'features']
  },

  // Tickets & Booking
  {
    id: 'select-seats',
    title: 'How to Select Seats',
    slug: 'how-to-select-seats',
    categoryId: 'tickets-booking',
    excerpt: 'Understanding the seat map and choosing the best seats for your event.',
    content: `# How to Select Seats

Choose the perfect seats for your event experience.

## Understanding the Seat Map

The interactive seat map shows:
- **Available** (white): Seats you can purchase
- **Sold** (red): Already purchased
- **Reserved** (yellow): Temporarily held by other users
- **Selected** (blue): Your current selection

## Selecting Seats

1. Click on available seats to select them
2. Selected seats turn blue
3. Click again to deselect
4. Use auto-select for quick selection of adjacent seats

## Seat Types & Pricing

- **VIP**: Front row, meet & greet access, exclusive perks
- **Premium**: Section A seating, early entry, premium gift pack
- **Standard**: Section B/C seating, great views
- **Economy**: Section D/E seating, budget-friendly option

## Tips for Best Seats

- VIP and Premium sell out fastest
- Center sections offer best sound and view
- Aisle seats provide easier access
- Check venue layout before selecting

## Seat Reservation

Selected seats are held for 10 minutes during checkout. Complete payment before the timer expires to secure your seats.`,
    tags: ['seats', 'seating', 'seat map', 'selection'],
    relatedArticles: ['buying-first-ticket', 'ticket-tiers']
  },
  {
    id: 'payment-methods',
    title: 'Payment Methods',
    slug: 'payment-methods',
    categoryId: 'tickets-booking',
    excerpt: 'Available payment options and how to complete your purchase.',
    content: `# Payment Methods

We accept multiple secure payment methods.

## Credit & Debit Cards

Accepted cards:
- Visa
- Mastercard
- American Express
- JCB

## Bank Transfer

Supported banks:
- BCA
- Mandiri
- BNI
- BRI

Instructions provided after order placement.

## E-Wallets

Digital payment options:
- DANA
- GoPay
- OVO
- ShopeePay

## Payment Security

- All transactions are SSL encrypted
- We never store your full card details
- PCI DSS compliant payment processing
- 3D Secure authentication for card payments

## Payment Process

1. Select tickets and proceed to checkout
2. Choose payment method
3. Enter payment details
4. Confirm transaction
5. Receive instant confirmation

## Service Fees

A 5% service fee applies to all purchases to cover payment processing and platform operations.`,
    tags: ['payment', 'credit card', 'bank transfer', 'ewallet'],
    relatedArticles: ['buying-first-ticket', 'refund-policy']
  },
  {
    id: 'ticket-tiers',
    title: 'Understanding Ticket Tiers',
    slug: 'understanding-ticket-tiers',
    categoryId: 'tickets-booking',
    excerpt: 'Differences between VIP, Premium, Standard, and Economy tickets.',
    content: `# Understanding Ticket Tiers

Choose the experience that's right for you.

## VIP Tickets

**Price**: Highest tier  
**Includes**:
- Front row seating
- Meet & greet with artists
- Exclusive merchandise package
- Soundcheck access
- VIP lounge with complimentary refreshments
- Dedicated fast-track entrance

## Premium Tickets

**Price**: Mid-high tier  
**Includes**:
- Section A seating (prime viewing area)
- Early entry access
- Premium event gift pack
- Dedicated entrance
- Better sight lines and acoustics

## Standard Tickets

**Price**: Mid tier  
**Includes**:
- Section B/C seating
- Standard entry
- Event program
- Good overall experience

## Economy Tickets

**Price**: Budget-friendly  
**Includes**:
- Section D/E seating
- Standard entry
- Full event access

## Choosing the Right Tier

Consider:
- Your budget
- Desired proximity to stage
- Interest in exclusive perks
- Event type and duration

All tiers provide full access to the main event. VIP and Premium add exclusive experiences.`,
    tags: ['tickets', 'tiers', 'vip', 'premium', 'pricing']
  },

  // Account & Security
  {
    id: 'password-reset',
    title: 'Resetting Your Password',
    slug: 'resetting-your-password',
    categoryId: 'account-security',
    excerpt: 'How to recover your account if you forget your password.',
    content: `# Resetting Your Password

Forgot your password? We'll help you regain access.

## Reset Process

1. Go to the **Login** page
2. Click **Forgot Password?**
3. Enter your registered email address
4. Check your inbox for reset link
5. Click the link (valid for 1 hour)
6. Create a new strong password
7. Log in with your new password

## Password Requirements

Your new password must:
- Be at least 8 characters long
- Include uppercase and lowercase letters
- Include at least one number
- Include at least one special character (!@#$%^&*)

## Didn't Receive Email?

- Check your spam/junk folder
- Verify you entered the correct email
- Wait a few minutes and try again
- Contact support if issue persists

## Security Tips

- Use a unique password for EventTicket
- Don't share your password
- Enable two-factor authentication
- Change password regularly
- Use a password manager`,
    tags: ['password', 'reset', 'forgot password', 'security', 'recovery']
  },
  {
    id: 'two-factor-auth',
    title: 'Setting Up Two-Factor Authentication',
    slug: 'setting-up-two-factor-authentication',
    categoryId: 'account-security',
    excerpt: 'Add an extra layer of security to your account with 2FA.',
    content: `# Setting Up Two-Factor Authentication

Protect your account with an additional security layer.

## What is 2FA?

Two-factor authentication requires two forms of verification:
1. Your password (something you know)
2. A code from your phone (something you have)

## Setup Steps

1. Go to **Dashboard > Settings > Security**
2. Click **Enable Two-Factor Authentication**
3. Choose your method:
   - **Authenticator App** (recommended): Google Authenticator, Authy
   - **SMS**: Receive codes via text message
4. Follow on-screen instructions
5. Save backup codes in a secure location

## Using 2FA

When logging in:
1. Enter email and password
2. Enter the 6-digit code from your authenticator app or SMS
3. Access granted

## Backup Codes

- Save backup codes when enabling 2FA
- Use them if you lose access to your phone
- Each code works once
- Generate new codes from settings

## Disabling 2FA

Contact support to disable 2FA if you've lost access to your authentication method.`,
    tags: ['2fa', 'two-factor', 'authentication', 'security', 'authenticator']
  },
  {
    id: 'update-profile',
    title: 'Updating Profile Information',
    slug: 'updating-profile-information',
    categoryId: 'account-security',
    excerpt: 'How to edit your personal details and preferences.',
    content: `# Updating Profile Information

Keep your account information current.

## Editable Information

From **Dashboard > Profile**, you can update:
- Full name
- Email address
- Phone number
- Profile picture
- Password
- Notification preferences

## Email Change

Changing your email requires:
1. Enter new email address
2. Verify current password
3. Confirm via link sent to new email
4. Old email receives notification of change

## Phone Number

Update your phone for:
- SMS notifications
- Two-factor authentication
- Emergency contact

## Profile Picture

Upload requirements:
- JPG, PNG, or GIF
- Maximum 5MB
- Recommended: 400x400px square

## Privacy Settings

Control who can see:
- Your profile information
- Purchase history
- Event attendance

## Account Deletion

To delete your account:
1. Go to **Settings > Account**
2. Click **Delete Account**
3. Confirm deletion
4. All data removed within 30 days

**Warning**: Deletion is permanent and cannot be undone.`,
    tags: ['profile', 'update', 'settings', 'personal info', 'account']
  },

  // Events
  {
    id: 'finding-events',
    title: 'Finding Events',
    slug: 'finding-events',
    categoryId: 'events',
    excerpt: 'Tips for discovering events that match your interests.',
    content: `# Finding Events

Discover events you'll love.

## Browse Events

Visit the **Events** page to see:
- Upcoming tours
- Featured events
- Recently added shows
- Events near you

## Search

Use the search bar to find:
- Specific artists or bands
- Event names
- Venues
- Genres

## Filters

Narrow results by:
- **Genre**: Metalcore, Alternative, Progressive, etc.
- **Date**: This week, this month, custom range
- **Location**: City or venue
- **Price**: Budget range
- **Availability**: Available, selling fast, last tickets

## Sort Options

Organize results by:
- Date (soonest first)
- Price (low to high)
- Popularity (most sold)

## Artist Lineup

Check the **Lineup** page for:
- Complete tour schedules
- Artist profiles
- Genre filtering
- Tour announcements

## Email Alerts

Get notified about:
- New events from favorite artists
- Events in your city
- Price drops
- Pre-sale access

Enable in **Dashboard > Settings > Notifications**.`,
    tags: ['events', 'search', 'filter', 'finding', 'discover']
  },
  {
    id: 'event-details',
    title: 'Understanding Event Details',
    slug: 'understanding-event-details',
    categoryId: 'events',
    excerpt: 'What to know before attending an event.',
    content: `# Understanding Event Details

Know before you go.

## Event Information

Each event page shows:
- **Artist/Band**: Performer name and tour
- **Date & Time**: Event schedule
- **Venue**: Location and address
- **Doors Open**: Entry time
- **Show Starts**: Performance start time
- **Genre**: Music style
- **Age Restriction**: If applicable

## Venue Information

Check for:
- Seating capacity
- Parking availability
- Public transport access
- Nearby hotels
- Food & beverage policy
- Prohibited items list

## What to Bring

Required:
- Your ticket (digital or printed)
- Valid government-issued ID
- Matching credit card (if used for purchase)

Recommended:
- Light jacket (indoor venues can be cold)
- Earplugs (for loud shows)
- Small bag (check venue policy)

## Event Policies

- **Re-entry**: Usually not permitted
- **Recording**: Check artist policy
- **Meet & Greet**: VIP ticket holders only
- **Merchandise**: Available at venue

## Weather & Cancellations

- Outdoor events may be affected by weather
- Check email for updates
- Refunds issued for cancelled events`,
    tags: ['event', 'details', 'information', 'venue', 'policies']
  },

  // Payment & Refunds
  {
    id: 'refund-policy',
    title: 'Refund Policy',
    slug: 'refund-policy',
    categoryId: 'payment-refunds',
    excerpt: 'When and how refunds are issued for ticket purchases.',
    content: `# Refund Policy

Understand our refund terms.

## When Refunds Are Issued

**Automatic Refunds**:
- Event cancelled by organizer
- Event postponed and you can't attend new date
- Venue change beyond reasonable distance

**Partial Refunds**:
- Event shortened significantly
- Lineup change (headliner cancellation)

**No Refunds**:
- Change of mind
- Unable to attend
- Missed event
- Travel/accommodation issues

## Refund Process

1. Eligible refunds processed automatically
2. Email notification sent
3. Refund to original payment method
4. Processing time: 5-10 business days

## Event Cancellations

If an event is cancelled:
- Full refund including service fees
- Email notification with refund timeline
- Automatic processing (no action required)

## Event Postponement

Options when event is postponed:
1. Keep tickets for new date
2. Request refund within 14 days

## Requesting a Refund

Contact support with:
- Order number
- Reason for refund
- Supporting documentation (if applicable)

Email: refunds@eventticket.com

## Resale Options

Can't attend? Consider:
- Transferring ticket to friend (where allowed)
- Using our ticket resale platform (coming soon)`,
    tags: ['refund', 'cancellation', 'policy', 'money back']
  }
];

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I buy tickets?',
    answer: 'Browse events on our Events page, select your preferred ticket tier and seats, then proceed to checkout. You can pay via credit card, bank transfer, or e-wallet. Digital tickets are delivered instantly to your email.',
  },
  {
    id: 'faq-2',
    question: 'Can I get a refund for my ticket?',
    answer: 'Refunds are available for cancelled events. For other circumstances, you can request a refund through our support ticket system. Refunds are processed to the original payment method within 5–10 business days.',
  },
  {
    id: 'faq-3',
    question: 'How do I reset my password?',
    answer: 'On the login page, click "Forgot Password?", enter your registered email, and follow the reset link sent to your inbox. The link is valid for 1 hour.',
  },
  {
    id: 'faq-4',
    question: 'Is my payment secure?',
    answer: 'Yes. All transactions are SSL encrypted and PCI DSS compliant. We support 3D Secure authentication for card payments. Your full card details are never stored on our servers.',
  },
  {
    id: 'faq-5',
    question: 'Can I transfer my ticket to someone else?',
    answer: 'Ticket transfer policies vary by event. Check the specific event details or contact support for assistance. Some events allow transfers through our platform.',
  },
  {
    id: 'faq-6',
    question: 'What payment methods do you accept?',
    answer: 'We accept Visa, Mastercard, American Express, JCB, and local bank transfers (BCA, Mandiri, BNI, BRI). E-wallet options include DANA, GoPay, OVO, and ShopeePay.',
  },
  {
    id: 'faq-7',
    question: 'How long does it take to receive my tickets?',
    answer: 'Digital tickets are delivered instantly after successful payment to your registered email. You can also access them from Dashboard > My Tickets.',
  },
  {
    id: 'faq-8',
    question: 'What if an event is cancelled?',
    answer: 'If an event is cancelled by the organizer, a full refund including service fees is automatically processed. You will receive an email notification with refund details.',
  },
];
