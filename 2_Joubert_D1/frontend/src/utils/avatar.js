// 2_Joubert 05084360
const palettes = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];
const styles = ['bottts-neutral', 'thumbs', 'shapes', 'pixel-art'];

const hashString = (value = '') => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
};

export const getAvatarPlaceholder = (seed = '', size = 120) => {
  const baseSeed = seed && seed.length ? seed : `${Date.now()}-${Math.random()}`;
  const hashed = Math.abs(hashString(baseSeed));
  const background = palettes[hashed % palettes.length];
  const style = styles[hashed % styles.length];
  const safeSize = Math.max(40, Math.min(size, 240));
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${hashed}&backgroundColor=${background}&radius=50&size=${safeSize}`;
};

export const resolveProfileImage = (imageUrl, seed = '', size = 120) =>
  imageUrl && imageUrl.length ? imageUrl : getAvatarPlaceholder(seed, size);

export default resolveProfileImage;
