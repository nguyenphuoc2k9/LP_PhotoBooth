import { authenticated,db,json } from '@/lib/server-store';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const row=db().prepare('SELECT image,published FROM frames WHERE id=?').get(id);
  if(!row||(!row.published&&!authenticated(req)))return json({error:'Không tìm thấy khung.'},404);
  return new Response(new Uint8Array(row.image as Uint8Array),{headers:{'Content-Type':'image/png','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

