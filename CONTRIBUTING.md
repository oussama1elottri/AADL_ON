# Contributing to AADL_ON

Thank you for your interest in contributing to **AADL_ON**. This document describes the project’s contribution workflow, coding standards, testing requirements, and security reporting procedures. Please read this document before submitting issues or pull requests.

---

## Table of contents

1. [Code of Conduct](#code-of-conduct)  
2. [How to get started](#how-to-get-started)  
3. [Issue workflow](#issue-workflow)  
4. [Branching & PR workflow](#branching--pr-workflow)  
5. [Commit message conventions](#commit-message-conventions)  
6. [Testing requirements](#testing-requirements)  
7. [PR checklist (maintainers & reviewers)](#pr-checklist-maintainers--reviewers)  
8. [Security reporting & responsible disclosure](#security-reporting--responsible-disclosure)  
9. [Coding style & linting](#coding-style--linting)  
10. [Documentation & examples](#documentation--examples)  
11. [License & legal notes](#license--legal-notes)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Please be respectful and constructive. Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the maintainers.

---

## How to get started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/AADL_ON.git
   cd AADL_ON
Create a feature branch from develop:

bash
Copy code
git checkout develop
git pull origin develop
git checkout -b feat/<short-description>
Install dependencies and run tests locally:

Contracts:

bash
Copy code
forge test
Frontend:

bash
Copy code
cd frontend
npm install
npm run lint
npm run test
Open an issue to discuss non-trivial work before coding if it affects architecture, privacy, or governance.