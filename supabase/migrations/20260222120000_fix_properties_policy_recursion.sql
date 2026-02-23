-- Fix infinite recursion: "Vendors can view properties" policy on properties
-- queried units, and units' policy queried properties (cycle).
-- The app only reads properties when the user is PM, so we remove the vendor
-- SELECT policy on properties. PMs still have full CRUD via "PMs can CRUD own properties".
DROP POLICY IF EXISTS "Vendors can view properties of assigned tasks" ON public.properties;
