
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Has-role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Institutions (1:1 con cliente)
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  responsible_person TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Waste records (un registro por día)
CREATE TABLE public.waste_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 31),
  aprovechables_organicos NUMERIC(10,2) DEFAULT 0,
  aprovechables NUMERIC(10,2) DEFAULT 0,
  no_aprovechables NUMERIC(10,2) DEFAULT 0,
  biosanitarios NUMERIC(10,2) DEFAULT 0,
  anatomopatologicos NUMERIC(10,2) DEFAULT 0,
  cortopunzantes NUMERIC(10,2) DEFAULT 0,
  de_animales NUMERIC(10,2) DEFAULT 0,
  farmacos NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, year, month, day)
);
ALTER TABLE public.waste_records ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_inst_updated BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_wr_updated BEFORE UPDATE ON public.waste_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto crear profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies
-- profiles
CREATE POLICY "users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- institutions
CREATE POLICY "client views own institution" ON public.institutions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "client updates own institution" ON public.institutions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admins view all institutions" ON public.institutions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage institutions" ON public.institutions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- waste_records
CREATE POLICY "client manages own waste" ON public.waste_records FOR ALL
  USING (EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.institutions i WHERE i.id = institution_id AND i.user_id = auth.uid()));
CREATE POLICY "admin views all waste" ON public.waste_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manages all waste" ON public.waste_records FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
