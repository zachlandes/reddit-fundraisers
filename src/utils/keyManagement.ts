export async function getEveryPublicKey(ctx: any): Promise<string> {
  try {
    const publicKey = await ctx.settings.get('every-public-api-key');
    if (typeof publicKey !== 'string') {
      throw new Error("Public API key is not properly configured.");
    }
    return publicKey;
  } catch (e) {
    console.error("Error retrieving public API key:", e);
    throw new Error("Failed to retrieve public API key.");
  }
}

export async function getEveryPrivateKey(ctx: any): Promise<string> {
  try {
    const privateKey = await ctx.settings.get('every-private-api-key');
    if (typeof privateKey !== 'string') {
      throw new Error("Private API key is not properly configured.");
    }
    return privateKey;
  } catch (e) {
    console.error("Error retrieving private API key:", e);
    throw new Error("Failed to retrieve private API key.");
  }
}
