import { PLACEHOLDER_COVER } from '../constants/imagePlaceholders';

export interface MenuItem {
  imageSrc: string;
  imageAlt: string;
  title: string;
  className?: string;
}

export interface MenuCategory {
  key: string;
  title: string;
  projects: MenuItem[];
}

/** Menu vitrine Palto : uniquement le produit Go (réservation course). */
export const menuCategories: MenuCategory[] = [
  {
    key: 'application',
    title: 'Application',
    projects: [
      {
        imageSrc: PLACEHOLDER_COVER,
        imageAlt: 'Go',
        title: 'Go',
      },
    ],
  },
];
