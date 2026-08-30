 "use client";
import {useState} from "react"; import {useRouter} from "next/navigation"; import {LockKeyhole} from "lucide-react"; import {getUser} from "@/lib/auth";
export default function Home(){const r=useRouter();const[e,setE]=useState("");const[p,setP]=useState("");const[err,setErr]=useState("");
function submit(x:any){x.preventDefault();const u=getUser(e,p);if(!u){setErr("Invalid email or password.");return}localStorage.setItem("lkd_user",JSON.stringify(u));r.push("/dashboard")}
return <main className="flex min-h-screen items-center justify-center p-5"><div className="card w-full max-w-md p-8">
<div className="mb-8 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-black text-white"><LockKeyhole/></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-neutral-500">Lock & Key</p><h1 className="text-xl font-bold">Digital CRM</h1></div></div>
<h2 className="text-2xl font-bold">Welcome back</h2><p className="mt-1 text-sm text-neutral-500">Sign in to your agency workspace.</p>
<form onSubmit={submit} className="mt-7 space-y-4"><div><label className="label">Email</label><input className="input" type="email" value={e} onChange={x=>setE(x.target.value)} required/></div><div><label className="label">Password</label><input className="input" type="password" value={p} onChange={x=>setP(x.target.value)} required/></div>{err&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}<button className="btn-dark w-full">Sign in</button></form>
<div className="mt-6 rounded-xl bg-neutral-50 p-4 text-xs text-neutral-600"><b>Demo accounts</b><br/>Admin: admin@lockandkeydigital.com / Admin@123<br/>HR: hr@lockandkeydigital.com / HR@12345</div>
</div></main>}