export type ProjectStatus = {
  id: number;
  name: string;
  color: string | null;
  order: number;
  wipLimit?: number | null;
  type?: string | null;
};

export type BoardMember = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
};
