import {Role} from "./types";
export const DEMO_USERS=[
 {email:"admin@lockandkeydigital.com",password:"Admin@123",role:"ADMIN" as Role,name:"Agency Admin"},
 {email:"hr@lockandkeydigital.com",password:"HR@12345",role:"HR" as Role,name:"HR Manager"}
];
export function getUser(email:string,password:string){return DEMO_USERS.find(u=>u.email.toLowerCase()===email.trim().toLowerCase()&&u.password===password)||null}