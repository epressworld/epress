# Contributing to epress

First of all, thank you for considering contributing to epress! We welcome every contributor with open arms.

This guide provides a clear contribution process to ensure your efforts can be smoothly integrated into the project. Following this guide helps us maintain consistent, high-quality code and orderly project development.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Step 0: Find or Create an Issue](#step-0-find-or-create-an-issue)
  - [Step 1: Fork & Clone the Repository](#step-1-fork--clone-the-repository)
  - [Step 2: Set Up Your Local Environment](#step-2-set-up-your-local-environment)
  - [Step 3: Create Your Development Branch](#step-3-create-your-development-branch)
  - [Step 4: Start Coding!](#step-4-start-coding)
  - [Step 5: Write and Run Tests](#step-5-write-and-run-tests)
  - [Step 6: Maintain Code Style Consistency](#step-6-maintain-code-style-consistency)
  - [Step 7: Commit Your Changes](#step-7-commit-your-changes)
  - [Step 8: Push Your Branch to Your Fork](#step-8-push-your-branch-to-your-fork)
  - [Step 9: Create a Pull Request](#step-9-create-a-pull-request)
  - [Step 10: Code Review and Merge](#step-10-code-review-and-merge)
- [Style Guides](#style-guides)
  - [Git Commit Message Convention](#git-commit-message-convention)
  - [Code Style Convention](#code-style-convention)

## Code of Conduct

We are committed to fostering an open, friendly, and respectful community. All contributors and maintainers are expected to adhere to our Code of Conduct. Before you start contributing, please take the time to read the [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

We use the standard GitHub Flow for collaboration. Here are the complete contribution steps:

### Step 0: Find or Create an Issue

All changes should revolve around an Issue.

- **If you want to fix a bug**: First, search the [Issues list](https://github.com/epressworld/epress/issues) to see if a related issue already exists. If not, create a new issue using the "Bug" label. Describe the steps to reproduce, expected behavior, and actual behavior in detail.
- **If you want to propose a new feature**: Create a new issue using the "Feature" label. Describe your idea, the problem it solves, and the proposed implementation in detail.

Before you start coding, please leave a comment on the issue indicating you'd like to work on it and wait for a maintainer's confirmation to avoid duplicate work.

### Step 1: Fork & Clone the Repository

1.  Fork the main repository to your own GitHub account.
2.  Clone your forked repository to your local machine:
    ```bash
    git clone https://github.com/YOUR_USERNAME/epress.git
    cd epress
    ```

### Step 2: Set Up Your Local Environment

In the project root directory, run the following command to install all dependencies:

```bash
npm install
```

Then, you can start the local development server:

```bash
npm run dev
```

### Step 3: Create Your Development Branch

Create a new branch from `main` to house your code. Please follow this naming convention:

- **New Feature**: `feature/ISSUE-NUMBER-short-description` (e.g., `feature/123-user-profile-page`)
- **Bug Fix**: `bugfix/ISSUE-NUMBER-short-description` (e.g., `bugfix/456-fix-login-button`)

```bash
git checkout -b feature/123-my-new-feature
```

### Step 4: Start Coding!

Now you can start making your code changes and developments.

### Step 5: Write and Run Tests

Quality is our lifeline. Please write necessary tests for your changes:

- If you add a new feature, write new test cases to cover it.
- If you fix a bug, write a test case to verify the bug is fixed (i.e., a test that would fail before the fix and pass after).

Run the following command to ensure all tests pass:

```bash
npm test
```

### Step 6: Maintain Code Style Consistency

This project uses [Biome](https://biomejs.dev/) to unify code style. Before committing your code, please run the following command to format your code and fix linting errors:

```bash
npm run lint:fix
```

### Step 7: Commit Your Changes

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for writing commit messages. This helps in auto-generating changelogs and version management.

The commit message format is: `<type>(<scope>): <subject>`

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, etc.
- **scope** (optional): The scope of the change, e.g., `client`, `server`, `graphql`.
- **subject**: A short description of the change.

**Examples:**
```bash
git commit -m "feat(client): Add user profile page"
git commit -m "fix(server): Correct avatar upload path validation"
```

### Step 8: Push Your Branch to Your Fork

```bash
git push origin feature/123-my-new-feature
```

### Step 9: Create a Pull Request

1.  Go to your forked repository page on GitHub. You will see a prompt to create a Pull Request.
2.  Ensure your PR targets the `main` branch of the main repository.
3.  Fill in a clear title and description for your PR.
4.  In the description, use the keyword `Closes #ISSUE-NUMBER` to link the issue you are addressing (e.g., `Closes #123`). This ensures the corresponding issue is automatically closed when the PR is merged.

### Step 10: Code Review and Merge

After submitting your PR, project maintainers will review your code. Please pay attention to comments on the PR and make changes based on the feedback. Once your code passes the review, a maintainer will merge it into the `main` branch.

## Style Guides

### Git Commit Message Convention

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Please ensure every one of your commits adheres to this format.

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries such as documentation generation

### Code Style Convention

We use [Biome](https://biomejs.dev/). All code style issues should be resolved by running `npm run lint:fix`. Please do not manually change code formatting unrelated to functionality in your PRs.

---

Thank you again for your valuable contribution!