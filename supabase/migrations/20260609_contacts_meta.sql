-- Migration: ajouter colonne meta JSONB sur la table contacts
-- Stocke tous les champs enrichis (score, signaux, SIREN, réseaux sociaux, etc.)
-- À exécuter dans Supabase Dashboard > SQL Editor

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
