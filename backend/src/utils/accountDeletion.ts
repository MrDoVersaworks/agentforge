export async function deleteAccountWithSessionInvalidation(
  deleteAccount: () => Promise<void>,
  invalidateAccessToken: () => void
): Promise<void> {
  await deleteAccount();
  invalidateAccessToken();
}
