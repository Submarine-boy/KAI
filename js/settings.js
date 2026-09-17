import { supabase } from './supabase.js';
const emailEl=document.getElementById('account-email');
const signOut=document.getElementById('sign-out');
const {data:{user}}=await supabase.auth.getUser();
if(user) emailEl.textContent=user.email||'Signed-in KIA staff account';
signOut?.addEventListener('click',async()=>{signOut.disabled=true;signOut.textContent='Signing out…';const {error}=await supabase.auth.signOut();if(error){signOut.disabled=false;signOut.textContent='Sign out';alert(error.message);return}location.href='index.html';});