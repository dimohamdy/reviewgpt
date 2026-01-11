declare module "google-play-scraper" {
  export interface GooglePlayReview {
    id: string;
    userName: string;
    userImage: string;
    date: string;
    score: number;
    scoreText: string;
    url: string;
    title: string;
    text: string;
    replyDate?: string;
    replyText?: string;
    version: string;
    thumbsUp: number;
    criterias?: Array<{
      criteria: string;
      rating: number;
    }>;
  }

  export interface GooglePlayApp {
    appId: string;
    title: string;
    summary: string;
    description: string;
    version: string;
    score: number;
    ratings: number;
    reviews: number;
    price: number;
    free: boolean;
    developer: string;
    developerEmail: string;
    genre: string;
    genreId: string;
    released: string;
    updated: string;
    installs: string;
  }

  export const sort: {
    NEWEST: number;
    RATING: number;
    HELPFULNESS: number;
  };

  export function reviews(options: {
    appId: string;
    lang?: string;
    country?: string;
    sort?: number;
    num?: number;
    paginate?: boolean;
    nextPaginationToken?: string;
  }): Promise<{
    data: GooglePlayReview[];
    nextPaginationToken?: string;
  }>;

  export function app(options: {
    appId: string;
    country?: string;
  }): Promise<GooglePlayApp>;

  const gplay: {
    reviews: typeof reviews;
    app: typeof app;
    sort: typeof sort;
  };

  export default gplay;
}
