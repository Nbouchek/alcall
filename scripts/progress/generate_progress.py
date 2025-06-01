import re
from pathlib import Path
from collections import defaultdict

# Files to scan
FILES = ["ROADMAP.md", "IMPLEMENTATION.md"]

# Output file
PROGRESS_MD = Path("PROGRESS.md")

CHECKBOX_PATTERN = re.compile(r"^\s*[-*] \[( |x|X)\] (.*)")
PHASE_PATTERN = re.compile(r"^#+ (Phase|PHASE|Phase [0-9]+|[A-Za-z ]+):? ?(.*)")


def parse_checkboxes(lines):
    """
    Returns a list of (checked, text, section) for each checkbox found.
    """
    results = []
    section = None
    for line in lines:
        # Section/phase headers
        m = PHASE_PATTERN.match(line)
        if m:
            section = line.strip().lstrip('#').strip()
        # Checkboxes
        m = CHECKBOX_PATTERN.match(line)
        if m:
            checked = m.group(1).lower() == 'x'
            text = m.group(2).strip()
            results.append((checked, text, section))
    return results


def aggregate_progress(checkboxes):
    total = len(checkboxes)
    done = sum(1 for c, _, _ in checkboxes if c)
    by_section = defaultdict(lambda: [0, 0])  # section: [done, total]
    for checked, _, section in checkboxes:
        if section:
            by_section[section][1] += 1
            if checked:
                by_section[section][0] += 1
    return total, done, by_section


def main():
    all_checkboxes = []
    for file in FILES:
        path = Path(file)
        if not path.exists():
            continue
        with path.open() as f:
            lines = f.readlines()
        checkboxes = parse_checkboxes(lines)
        all_checkboxes.extend(checkboxes)

    total, done, by_section = aggregate_progress(all_checkboxes)
    percent = (done / total * 100) if total else 0

    # Write progress summary
    with PROGRESS_MD.open("w") as f:
        f.write(f"# Project Progress\n\n")
        f.write(f"**Overall Progress:** {done} / {total} tasks complete ({percent:.1f}%)\n\n")
        f.write(f"## Progress by Section/Phase\n\n")
        for section, (s_done, s_total) in sorted(by_section.items()):
            s_percent = (s_done / s_total * 100) if s_total else 0
            f.write(f"- **{section}**: {s_done} / {s_total} ({s_percent:.1f}%)\n")
        f.write("\n---\n")
        f.write("\n*This file is auto-generated. Do not edit manually. It updates on every commit to reflect the current state of ROADMAP.md and IMPLEMENTATION.md.*\n")

if __name__ == "__main__":
    main()
