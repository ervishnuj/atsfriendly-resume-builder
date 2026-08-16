drop policy if exists "Signed-in users can view UPI QR" on storage.objects;
create policy "Admins can view UPI QR" on storage.objects for select to authenticated
using (bucket_id = 'upi-qr' and private.is_app_admin(auth.uid()));