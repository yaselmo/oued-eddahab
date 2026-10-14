export type ResourceViewStore = {
  insert(resourceId: string, userId: string): Promise<boolean>;
  count(resourceId: string): Promise<number>;
};

export async function recordUniqueResourceView(
  store: ResourceViewStore,
  resourceId: string,
  userId: string,
) {
  const recorded = await store.insert(resourceId, userId);
  const views = await store.count(resourceId);

  return { recorded, views };
}
