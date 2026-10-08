import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { SharedFrame } from './shared-frames';

let database: DatabaseSync | undefined;
export function db() {
  if (database) return database;
  const dir=path.resolve(/* turbopackIgnore: true */ process.env.PHOTOBOOTH_DATA_DIR || '.data'); mkdirSync(dir,{recursive:true});
  database=new DatabaseSync(path.join(dir,'photobooth.sqlite'));
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (email TEXT PRIMARY KEY, count INTEGER NOT NULL, blocked INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS frames (id TEXT PRIMARY KEY, name TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL, slots TEXT NOT NULL, overlay INTEGER NOT NULL, caption INTEGER NOT NULL, published INTEGER NOT NULL, updated INTEGER NOT NULL, image BLOB NOT NULL);
  `);
  if(!database.prepare('PRAGMA table_info(frames)').all().some(column=>column.name==='design'))
    database.exec("ALTER TABLE frames ADD COLUMN design TEXT NOT NULL DEFAULT '{}' ");
  return database;
}
export function hasAdmin(){return !!db().prepare('SELECT id FROM admins LIMIT 1').get();}
export function localSetup(req:Request){return process.env.NODE_ENV==='development'&&['localhost','127.0.0.1','[::1]'].includes(new URL(req.url).hostname);}
export function originAllowed(req:Request) {
  const origin=req.headers.get('origin');
  if(!origin||origin==='null')return false;
  // Next's development server can normalize req.url to localhost even when the
  // browser uses 127.0.0.1. Host preserves the address actually requested by the
  // browser. Never use forwarded-host here; proxies should set APP_ORIGIN.
  try {
    const url=new URL(req.url);
    const expected=process.env.APP_ORIGIN
      ? new URL(process.env.APP_ORIGIN).origin
      : url.protocol+'//'+(req.headers.get('host')||url.host);
    return origin===expected;
  } catch { return false; }
}
export function hashPassword(password:string) {
  const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');
}
export function passwordMatches(password:string,stored:string) {
  const [salt,hash]=stored.split(':');const derived=scryptSync(password,salt,64);const expected=Buffer.from(hash,'hex');
  return expected.length===derived.length&&timingSafeEqual(expected,derived);
}
export function tokenHash(value:string){return createHash('sha256').update(value).digest('hex');}
export function authenticated(req:Request) {
  const cookie=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('stillroom_session='));
  const token=cookie?.slice('stillroom_session='.length);
  if(!token||!/^[a-f0-9]{64}$/.test(token))return false;
  return !!db().prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(tokenHash(token),Date.now());
}
export function sessionCookie(token:string,maxAge=86400) {
  return 'stillroom_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+maxAge+(process.env.NODE_ENV==='production'?'; Secure':'');
}
export function createSession() {
  const token=randomBytes(32).toString('hex');db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
  db().prepare('INSERT INTO sessions(token,expires) VALUES(?,?)').run(tokenHash(token),Date.now()+86400000);return token;
}
export function frameRecord(row:Record<string,unknown>):SharedFrame {
  return {...JSON.parse(String(row.design||'{}')),id:String(row.id),name:String(row.name),width:Number(row.width),height:Number(row.height),slots:JSON.parse(String(row.slots)),overlay:!!row.overlay,showCaption:!!row.caption,published:!!row.published,updatedAt:Number(row.updated),src:'/api/frames/'+row.id+'/image/?v='+row.updated};
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export async function limitedJson(req:Request,max=10*1024*1024) {
  if(Number(req.headers.get('content-length')||0)>max)throw new Error('Dữ liệu quá lớn.');
  const reader=req.body?.getReader();if(!reader)throw new Error('Thiếu dữ liệu.');
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw new Error('Dữ liệu quá lớn.');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

