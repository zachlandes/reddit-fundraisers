# Fundraisers

[![Mutable.ai Auto Wiki](https://img.shields.io/badge/Auto_Wiki-Mutable.ai-blue)](https://wiki.mutable.ai/zachlandes/reddit-fundraisers)

Fundraisers is an app for Reddit, built on Reddit's devvit platform, that helps users create fundraisers for nonprofits via every.org and display them as posts where anyone can donate. These fundraiser posts stay updated in real-time with the latest tally of funds raised! To date, over $62 million dollars have been donated to every.org to support over 5,600 nonprofits!

## Features

- Create an interactive fundraiser post on reddit from a fundraiser on [every.org](https://every.org).
- Donate to fundraisers 
- Fundraiser posts update in realtime

## Installation

Install the app on a subreddit you moderate via the [App Directory](https://developers.reddit.com/apps/fundraisers-app).

For more details about apps for Reddit, visit the [Reddit Developer Documentation](https://developers.reddit.com/docs/next/mod_resources).

## Usage

For a high-level overview of donations on every.org, go to [every.org/about-us](https://www.every.org/about-us).

### Creating a fundraiser (moderators)

1. Create an account and fundraiser on [every.org](https://every.org). We recommend including a description, cover image, and a goal.
2. Copy the URL for your every.org fundraiser.
3. Go to your subreddit, click the subreddit menu button on the right side of your subreddit home "(...)".
4. Select "Create a fundraiser post with the Fundraisers app".
5. Paste the every.org fundraiser URL, give your post a title, and click submit.
6. Pin the post as long as the fundraiser is running to maximize donations for your chosen nonprofit!

### Donating to a fundraiser

1. Click the "Donate" button on the fundraiser post.
2. Follow the instructions to donate to the fundraiser.
3. A receipt will be emailed to you for tax purposes. 
4. All donations to the nonprofit are sent once per week by every.org if the nonprofit has registered a bank account with every.org. Otherwise, donations may take 1-8 weeks to reach the nonprofit, typically monthly. More details at the [disbursements page](https://support.every.org/hc/en-us/articles/360061887233-Disbursements-overview).

### Additional notes for everyone

1. Every.org is a nonprofit Donor Advised Fund. For more details, you can start at this every.org [explainer](https://support.every.org/hc/en-us/articles/5715755336083-What-is-the-501-c-3-tax-exempt-status-of-Every-org).
2. If there is no way to disburse funds to a nonprofit, donors will be notified and allowed to donate their funds to any other nonprofit on the every.org site (1 million+ nonprofits).
3. If the nonprofit has registered a valid bank account with every.org, there are no platform fees. If every.org has to use the Network For Good platform to disburse funds, there is currently (July 2024) a 2.25% platform fee. Again, please read the [disbursements page](https://support.every.org/hc/en-us/articles/360061887233-Disbursements-overview).

### Additional tips for fundraiser creators (moderators)

1. We recommend creating fundraisers with nonprofits that have claimed their profile on every.org. This ensures that the funds are disbursed to the nonprofit as quickly as possible.
3. If the nonprofit you'd like to create a fundraiser for is not registered, you can contact them via their every.org page to request they register.
4. If there is no way to disburse funds to a nonprofit, donors will be notified and allowed to donate their funds to any other nonprofit on the every.org site (1 million + nonprofits).
5. We highly recommend reading the every.org [FAQs](https://support.every.org/hc/en-us/articles/360059359213-How-does-making-a-donation-on-Every-org-work) to understand how donations work.
6. Long fundraiser titles will be truncated on the reddit post as of version 1.1.0 of the Fundraisers app. We recommend keeping your every.org fundraiser title short. Your Reddit post title can be longer, like any other Reddit post title.

## Development Setup

1. Clone the repository:
    ```sh
    git clone https://github.com/zachlandes/reddit-fundraisers.git
    cd reddit-fundraisers
    ```

2. Follow the node and devvit installation instructions provided in the [Reddit Dev Guide](https://developers.reddit.com/docs/next/dev_guide).

## Contribution

If you have any comments or suggestions, feel free to get in touch with us on Reddit: [u/thezachlandes](https://www.reddit.com/user/thezachlandes).

## Repository

For the latest updates and to contribute to the project, visit our [GitHub repository](https://github.com/zachlandes/reddit-fundraisers/tree/main).

## License

Our code is available for use under the highly permissive BSD-3 license. We encourage you to reuse whatever elements of the codebase you find useful for your original projects, with appropriate attribution.