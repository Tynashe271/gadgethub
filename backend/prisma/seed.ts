import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){
  const email=process.env.ADMIN_EMAIL;const password=process.env.ADMIN_PASSWORD;
  if(!email||!password||password.length<12)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) before bootstrapping an administrator');
  const passwordHash=await bcrypt.hash(password,12);
  await db.user.upsert({where:{email:email.toLowerCase()},update:{passwordHash,role:'SUPER_ADMIN',isActive:true},create:{email:email.toLowerCase(),firstName:process.env.ADMIN_FIRST_NAME??'System',lastName:process.env.ADMIN_LAST_NAME??'Administrator',passwordHash,role:'SUPER_ADMIN'}});
  console.log(`Administrator ${email.toLowerCase()} bootstrapped. No sample catalogue or content was created.`);
}
main().finally(()=>db.$disconnect());
