// Chemin hors segment de langue : renvoi vers la langue par défaut.
import { redirect } from 'next/navigation';

export default function RootNotFound() {
  redirect('/fr');
}
