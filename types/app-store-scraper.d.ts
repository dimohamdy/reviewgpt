declare module "app-store-scraper" {
  export interface AppStoreReview {
    id: string;
    userName: string;
    userUrl: string;
    version: string;
    score: number;
    title: string;
    text: string;
    url: string;
    updated: string;
  }

  export interface AppStoreApp {
    id: string;
    bundleId: string;
    title: string;
    description: string;
    version: string;
    score: number;
    reviews: number;
    ratings: number;
    price: number;
    free: boolean;
    developer: string;
    genre: string;
    genreId: string;
    released: string;
    currentVersionReleaseDate: string;
  }

  export const sort: {
    RECENT: number;
    HELPFUL: number;
  };

  export function reviews(options: {
    id: string;
    country?: string;
    page?: number;
    sort?: number;
  }): Promise<AppStoreReview[]>;

  export function app(options: {
    id: string;
    country?: string;
  }): Promise<AppStoreApp>;

  const appStoreScraper: {
    reviews: typeof reviews;
    app: typeof app;
    sort: typeof sort;
  };

  export default appStoreScraper;
}
