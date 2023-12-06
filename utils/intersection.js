export const intersection = args => {
  const flattenedCombinedArray = [...args].flat();
  console.log(flattenedCombinedArray);
  const flattenedCombinedArrayWithoutNulls = flattenedCombinedArray.filter(
    elem => elem
  );
  console.log(flattenedCombinedArrayWithoutNulls);
  return (
    new Set(flattenedCombinedArrayWithoutNulls).size !==
    flattenedCombinedArrayWithoutNulls.length
  );
};

export const inRange = (value, min, max) => {
  return value >= min && value <= max;
};
