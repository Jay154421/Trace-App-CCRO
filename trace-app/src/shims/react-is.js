import { Fragment } from 'react';

export function isFragment(node) {
  return Boolean(node && typeof node === 'object' && node.type === Fragment);
}
