
function identity(l: string) {
  return l;
}

// Disable any colours because they are difficult to verify in testing
export default {
  redBright: identity,
  blue: identity,
  blueBright: identity,
};
