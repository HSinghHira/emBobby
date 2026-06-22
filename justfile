deploy:
    git add -A
    git diff --cached --quiet || git commit -m "Update"
    git push -u origin main --force
