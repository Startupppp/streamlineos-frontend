import { ZodError } from "zod";

import { teamRowContract, teamDetailContract } from "./teams-schema";

const bareTeamRow = {
  id: 1,
  orgId: "org-1",
  name: "Platform",
  key: "PLAT",
  icon: null,
  color: null,
  isPrivate: false,
  pmWorkspaceId: "ws-1",
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
  deletedAt: null,
};

it("accepts the bare project_teams row createTeam/updateTeam actually return, with no members array", () => {
  const result = teamRowContract.parse(bareTeamRow);

  expect(result.key).toBe("PLAT");
});

it("rejects the same bare row against teamDetailContract, proving createTeam/updateTeam must not reuse it", () => {
  expect(() => teamDetailContract.parse(bareTeamRow)).toThrow(ZodError);
});

it("still accepts the full detail shape getTeam returns, including members", () => {
  const result = teamDetailContract.parse({
    ...bareTeamRow,
    members: [
      {
        userId: "user-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
        image: null,
        role: "MEMBER",
      },
    ],
  });

  expect(result.members).toHaveLength(1);
});
