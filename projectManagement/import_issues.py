import csv
import subprocess
import time

# --- Configuration ---
CSV_FILE_PATH = 'project_plan.csv'
# Replace with your GitHub username and repository name
# For example: 'your-username/your-repo-name'
GITHUB_REPO = 'YOUR_USERNAME/YOUR_REPOSITORY' 
# --- End Configuration ---


def create_github_issue(issue_data):
    """
    Constructs and executes the gh CLI command to create a GitHub issue.
    """
    # 1. Construct the issue title
    title = f"[{issue_data['ID']}] {issue_data['Title']}"

    # 2. Construct the issue body using Markdown
    # This makes the issue rich and readable
    body = f"""
### Task Details
**Task Type:** {issue_data['Task Type']}
**Epic:** {issue_data['Parent ID']}

### Description & Technical Notes
{issue_data['Description & Technical Notes']}

### Learning Objective
{issue_data['Learning Objective']}

### Acceptance Criteria (AC)
> {issue_data['Acceptance Criteria (AC)']}

---
**Labels:** `{issue_data['Labels']}`
**Dependencies:** `{issue_data['Dependencies']}`
**Story Points:** `{issue_data['Story Points']}`
    """

    # 3. Construct the gh command
    # We use --label for each label to add them correctly
    labels = issue_data['Labels'].split(',')
    command = [
        'gh', 'issue', 'create',
        '--title', title,
        '--body', body,
        '--repo', GITHUB_REPO
    ]
    for label in labels:
        if label.strip(): # Ensure label is not empty
            command.extend(['--label', label.strip()])
            
    # Optional: Assign the issue to yourself
    command.extend(['--assignee', '@me'])

    # 4. Execute the command
    print(f"Creating issue: {title}")
    try:
        # We use subprocess.run to execute the command line tool
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print(f"SUCCESS: {result.stdout.strip()}")
    except subprocess.CalledProcessError as e:
        print(f"ERROR creating issue: {title}")
        print(f"Stderr: {e.stderr}")


def main():
    """
    Main function to read the CSV and create issues.
    """
    if GITHUB_REPO == 'YOUR_USERNAME/YOUR_REPOSITORY':
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print("!!! PLEASE EDIT THE SCRIPT AND SET YOUR GITHUB_REPO  !!!")
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        return

    print(f"Starting import of issues from '{CSV_FILE_PATH}' to repo '{GITHUB_REPO}'...")
    
    with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            # We only want to create issues for actionable tasks, not epics or features
            if row['Task Type'] in ['Task', 'Chore', 'Test', 'Docs', 'Research']:
                create_github_issue(row)
                # Add a small delay to avoid hitting API rate limits
                time.sleep(2) 

    print("Import complete.")


if __name__ == '__main__':
    main()