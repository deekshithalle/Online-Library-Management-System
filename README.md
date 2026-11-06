# Online Library Management System

Academic project using Node.js, Express, SQLite, HTML, CSS and JavaScript.

## Modules
- Admin login
- Add, update, delete and search books
- Student registration
- Issue books and return books
- Calculate overdue fines (default ₹5 per late day)

## Run
Requires Node.js 22+.
```bash
npm install
npm start
```
Open http://localhost:3000. Demo login: `admin` / `admin123`.

## Unit tests
```bash
npm test
```

## Selenium UI tests
Start the server in one terminal (`npm start`), then:
```bash
npm run test:selenium
```
Screenshots are saved to `test-evidence/`.

## GitHub
```bash
git init
git add .
git commit -m "Initial library management system"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Docker
```bash
docker build -t online-library-management:1.0 .
docker run -d --name library-container -p 3000:3000 -v library-data:/app/database online-library-management:1.0
docker ps
docker logs library-container
```

## Jenkins
Create a Pipeline job connected to this GitHub repository and select `Jenkinsfile`.
The included Jenkinsfile uses Windows `bat` steps. Use a Windows Jenkins agent with Node.js and Docker installed; on Linux agents, change `bat` to `sh`.

## Configuration
Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `PORT`, and `FINE_PER_DAY` as environment variables before deployment. Demo credentials are for local academic testing only.
