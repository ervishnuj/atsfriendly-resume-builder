CREATE POLICY "Signed-in users can view UPI QR" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'upi-qr');
CREATE POLICY "Admins upload UPI QR" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'upi-qr' AND private.is_app_admin(auth.uid()));
CREATE POLICY "Admins update UPI QR" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'upi-qr' AND private.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete UPI QR" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'upi-qr' AND private.is_app_admin(auth.uid()));