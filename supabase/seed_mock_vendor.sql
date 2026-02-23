-- Mock vendor: one vendor row for the first PM. Use it to assign tasks; optional: create a user with the same email to log in as that vendor.
-- Run in Supabase SQL Editor. Requires at least one PM user to exist.

INSERT INTO public.vendors (pm_id, name, email, phone, specialty)
SELECT pm_id, 'Mock Vendor', 'mockvendor@test.com', '+1 555-000-0000', 'Cleaning'
FROM (SELECT user_id AS pm_id FROM public.user_roles WHERE role = 'pm' LIMIT 1) pm
WHERE NOT EXISTS (
  SELECT 1 FROM public.vendors v WHERE v.pm_id = pm.pm_id AND v.email = 'mockvendor@test.com'
);

-- To log in as this vendor: in Dashboard → Authentication → Add user, create email mockvendor@test.com with any password. On first login the app links this vendor row to that user so you see assigned tasks.
