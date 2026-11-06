const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const sqlite3=require("sqlite3").verbose();
const path=require("path"),fs=require("fs");
const app = express();
const PORT = process.env.PORT || 3001;
fs.mkdirSync(path.join(__dirname,"database"),{recursive:true});
const db=new sqlite3.Database(path.join(__dirname,"database","library.db"));
const run=(s,p=[])=>new Promise((ok,no)=>db.run(s,p,function(e){e?no(e):ok({id:this.lastID,changes:this.changes})}));
const get=(s,p=[])=>new Promise((ok,no)=>db.get(s,p,(e,r)=>e?no(e):ok(r)));
const all=(s,p=[])=>new Promise((ok,no)=>db.all(s,p,(e,r)=>e?no(e):ok(r)));
const wrap=f=>(q,s,n)=>Promise.resolve(f(q,s,n)).catch(n);
const admin = (req, res, next) => {
    if (req.session.admin) {
        return next();
    }
    return res.status(401).json({ error: "Admin login required" });
};
app.use(express.json());app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||"local-demo-secret-change-me",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax"}}));
app.use(express.static(path.join(__dirname,"public")));
async function init(){
 await run("CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY,username TEXT UNIQUE,password_hash TEXT NOT NULL)");
 await run("CREATE TABLE IF NOT EXISTS books(id INTEGER PRIMARY KEY,title TEXT NOT NULL,author TEXT NOT NULL,isbn TEXT UNIQUE,category TEXT,total_copies INTEGER NOT NULL,available_copies INTEGER NOT NULL)");
 await run("CREATE TABLE IF NOT EXISTS students(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,phone TEXT)");
 await run("CREATE TABLE IF NOT EXISTS loans(id INTEGER PRIMARY KEY,book_id INTEGER NOT NULL,student_id INTEGER NOT NULL,issue_date TEXT NOT NULL,due_date TEXT NOT NULL,return_date TEXT,fine REAL DEFAULT 0,status TEXT DEFAULT 'ISSUED',FOREIGN KEY(book_id) REFERENCES books(id),FOREIGN KEY(student_id) REFERENCES students(id))");
 const u=process.env.ADMIN_USERNAME||"admin",p=process.env.ADMIN_PASSWORD||"admin123";
 if(!await get("SELECT id FROM admins WHERE username=?",[u])) await run("INSERT INTO admins(username,password_hash) VALUES(?,?)",[u,await bcrypt.hash(p,10)]);
 if(!(await get("SELECT COUNT(*) n FROM books")).n){
  for(const b of [["The Alchemist","Paulo Coelho","9780061122415","Fiction",4],["Clean Code","Robert C. Martin","9780132350884","Programming",3],["Wings of Fire","A. P. J. Abdul Kalam","9788173711466","Biography",2]])
   await run("INSERT INTO books(title,author,isbn,category,total_copies,available_copies) VALUES(?,?,?,?,?,?)",[...b,b[4]]);
 }
}
app.get("/api/health",(q,s)=>s.json({status:"ok"}));
app.get("/api/session",(q,s)=>s.json({loggedIn:!!q.session.admin,username:q.session.admin?.username||null}));
app.post("/api/login",wrap(async(q,s)=>{const {username,password}=q.body;if(!username||!password)return s.status(400).json({error:"Username and password required"});const a=await get("SELECT * FROM admins WHERE username=?",[username]);if(!a||!await bcrypt.compare(password,a.password_hash))return s.status(401).json({error:"Invalid username or password"});q.session.admin={id:a.id,username:a.username};s.json({message:"Login successful"});}));
app.post("/api/logout",(q,s)=>q.session.destroy(()=>s.json({message:"Logged out"})));
app.get("/api/books",wrap(async(q,s)=>{const x=`%${(q.query.q||"").trim()}%`;s.json(await all(q.query.q?"SELECT * FROM books WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? ORDER BY title":"SELECT * FROM books ORDER BY title",q.query.q?[x,x,x]:[]));}));
app.post("/api/books",admin,wrap(async(q,s)=>{const {title,author,isbn="",category="",total_copies=1}=q.body,n=Number(total_copies);if(!title?.trim()||!author?.trim()||!Number.isInteger(n)||n<1)return s.status(400).json({error:"Valid title, author and copies required"});const r=await run("INSERT INTO books(title,author,isbn,category,total_copies,available_copies) VALUES(?,?,?,?,?,?)",[title.trim(),author.trim(),isbn||null,category,n,n]);s.status(201).json({message:"Book added",id:r.id});}));
app.put("/api/books/:id",admin,wrap(async(q,s)=>{const b=await get("SELECT * FROM books WHERE id=?",[q.params.id]);if(!b)return s.status(404).json({error:"Book not found"});const {title,author,isbn="",category="",total_copies}=q.body,n=Number(total_copies),issued=b.total_copies-b.available_copies;if(!title?.trim()||!author?.trim()||!Number.isInteger(n)||n<1||n<issued)return s.status(400).json({error:"Invalid details or copies below issued count"});await run("UPDATE books SET title=?,author=?,isbn=?,category=?,total_copies=?,available_copies=? WHERE id=?",[title.trim(),author.trim(),isbn||null,category,n,n-issued,q.params.id]);s.json({message:"Book updated"});}));
app.delete("/api/books/:id",admin,wrap(async(q,s)=>{if((await get("SELECT COUNT(*) n FROM loans WHERE book_id=? AND status='ISSUED'",[q.params.id])).n)return s.status(409).json({error:"Cannot delete a book with active issues"});const r=await run("DELETE FROM books WHERE id=?",[q.params.id]);if(!r.changes)return s.status(404).json({error:"Book not found"});s.json({message:"Book deleted"});}));
app.get("/api/students",admin,wrap(async(q,s)=>s.json(await all("SELECT * FROM students ORDER BY name"))));
app.post("/api/students",admin,wrap(async(q,s)=>{const {name,email,phone=""}=q.body;if(!name?.trim()||!email?.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return s.status(400).json({error:"Valid name and email required"});const r=await run("INSERT INTO students(name,email,phone) VALUES(?,?,?)",[name.trim(),email.trim().toLowerCase(),phone.trim()]);s.status(201).json({message:"Student registered",id:r.id});}));
app.get("/api/loans",admin,wrap(async(q,s)=>s.json(await all("SELECT l.*,b.title book_title,st.name student_name FROM loans l JOIN books b ON b.id=l.book_id JOIN students st ON st.id=l.student_id ORDER BY l.id DESC"))));
app.post("/api/loans/issue",admin,wrap(async(q,s)=>{const {book_id,student_id,issue_date,due_date}=q.body;if(!book_id||!student_id||!issue_date||!due_date||due_date<issue_date)return s.status(400).json({error:"Select book, student and valid dates"});const b=await get("SELECT * FROM books WHERE id=?",[book_id]),st=await get("SELECT * FROM students WHERE id=?",[student_id]);if(!b||!st)return s.status(404).json({error:"Book or student not found"});if(b.available_copies<1)return s.status(409).json({error:"Book is unavailable"});await run("INSERT INTO loans(book_id,student_id,issue_date,due_date) VALUES(?,?,?,?)",[book_id,student_id,issue_date,due_date]);await run("UPDATE books SET available_copies=available_copies-1 WHERE id=?",[book_id]);s.status(201).json({message:"Book issued successfully"});}));
app.post("/api/loans/:id/return",admin,wrap(async(q,s)=>{const l=await get("SELECT * FROM loans WHERE id=?",[q.params.id]);if(!l)return s.status(404).json({error:"Issue record not found"});if(l.status==="RETURNED")return s.status(409).json({error:"Book already returned"});const date=q.body.return_date||new Date().toISOString().slice(0,10),days=Math.max(0,Math.ceil((new Date(date)-new Date(l.due_date))/86400000)),fine=days*(Number(process.env.FINE_PER_DAY)||5);await run("UPDATE loans SET return_date=?,fine=?,status='RETURNED' WHERE id=?",[date,fine,q.params.id]);await run("UPDATE books SET available_copies=available_copies+1 WHERE id=?",[l.book_id]);s.json({message:"Book returned successfully",late_days:days,fine});}));
app.get("/api/dashboard",admin,wrap(async(q,s)=>{const b=await get("SELECT COUNT(*) titles,COALESCE(SUM(total_copies),0) copies FROM books"),st=await get("SELECT COUNT(*) n FROM students"),lo=await get("SELECT COUNT(*) n FROM loans WHERE status='ISSUED'"),f=await get("SELECT COALESCE(SUM(fine),0) n FROM loans");s.json({book_titles:b.titles,total_copies:b.copies,students:st.n,active_issues:lo.n,fines_collected:f.n});}));
app.use((e,q,s,n)=>{if(e.code==="SQLITE_CONSTRAINT")return s.status(409).json({error:"Duplicate value: record already exists"});console.error(e);s.status(500).json({error:"Internal server error"});});
init().then(()=>app.listen(PORT,"0.0.0.0",()=>console.log(`Library app running at http://localhost:${PORT}`))).catch(e=>{console.error(e);process.exit(1);});
