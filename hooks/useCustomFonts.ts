import { useEffect } from 'react';
import { CustomizationAsset } from '../types';
import { createFontFaceDeclaration } from '../utils/fonts';

const STYLE_ATTRIBUTE = 'data-custom-font-faces';

const useCustomFonts = (assets: CustomizationAsset[]): void => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const fontAssets = assets.filter(asset => asset.type === 'font');

    if (fontAssets.length === 0) {
      return;
    }

    const uniqueDeclarations: string[] = [];
    const seenFamilies = new Set<string>();

    fontAssets.forEach(asset => {
      const declaration = createFontFaceDeclaration(asset);
      const familyMatch = declaration.match(/font-family: "([^"]+)";/);
      const family = familyMatch ? familyMatch[1] : asset.name;
      if (seenFamilies.has(family)) {
        return;
      }
      seenFamilies.add(family);
      uniqueDeclarations.push(declaration);
    });

    if (uniqueDeclarations.length === 0) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.setAttribute(STYLE_ATTRIBUTE, 'true');
    styleElement.textContent = uniqueDeclarations.join('\n');
    document.head.appendChild(styleElement);

    return () => {
      styleElement.remove();
    };
  }, [assets]);
};

export default useCustomFonts;
