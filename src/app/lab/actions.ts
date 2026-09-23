"use server";

/** Server Function for the boundary drill: the one kind of function that may be passed to a Client Component. */
export async function stampClick(clicks: number): Promise<string> {
  return `click #${clicks} handled on the server at ${new Date().toISOString()}`;
}
