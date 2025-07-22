export function getFullSizeImageUrl(thumbnailUrl) {
  console.log('🔧 getFullSizeImageUrl called with:', thumbnailUrl);
  if (!thumbnailUrl || typeof thumbnailUrl !== 'string') return '';
  try {
    if (thumbnailUrl.includes('cdn.modulus.co.il')) {
      const result = thumbnailUrl.split('?')[0];
      console.log('🔧 cdn.modulus.co.il processed:', { original: thumbnailUrl, result });
      return result;
    }
    if (thumbnailUrl.includes('www.gag-lachayot.co.il')) {
      const result = thumbnailUrl
        .replace(/-\d+x\d+(\.[a-zA-Z0-9]+(?:[?#].*)?)$/, '$1')
        .replace(/-\d+x\d+$/, '');
      console.log('🔧 www.gag-lachayot.co.il processed:', { original: thumbnailUrl, result });
      return result;
    }
    if (thumbnailUrl.includes('www.all4pet.co.il')) {
      const result = thumbnailUrl
        .replace(/_small(\.[a-zA-Z0-9]+(?:[?#].*)?)$/, '$1')
        .replace(/_small$/, '');
      console.log('🔧 www.all4pet.co.il processed:', { original: thumbnailUrl, result });
      return result;
    }
    if (thumbnailUrl.includes('d3m9l0v76dty0.cloudfront.net')) {
      const result = thumbnailUrl
        .replace('/show/', '/extra_large/')
        .replace('/index/', '/extra_large/')
        .replace('/large/', '/extra_large/');
      console.log('🔧 d3m9l0v76dty0.cloudfront.net processed:', { original: thumbnailUrl, result });
      return result;
    }
    if (thumbnailUrl.includes('just4pet.co.il')) {
      const parts = thumbnailUrl.split('/');
      const filenameWithQuery = parts.pop();
      const filenameParts = filenameWithQuery.split('?');
      const filename = filenameParts[0];
      const query = filenameParts.length > 1 ? `?${filenameParts[1]}` : '';
      if (filename.startsWith('tn_')) {
        const newFilename = filename.substring(3);
        const result = `${parts.join('/')}/${newFilename}${query}`;
        console.log('🔧 just4pet.co.il processed:', { original: thumbnailUrl, result });
        return result;
      }
    }
    if (thumbnailUrl.includes('cdn.biopet.co.il')) {
      // For biopet, try to get a larger version by adding size parameters
      const result = thumbnailUrl.includes('?') 
        ? `${thumbnailUrl}&size=large`
        : `${thumbnailUrl}?size=large`;
      console.log('🔧 cdn.biopet.co.il processed:', { original: thumbnailUrl, result });
      return result;
    }
    console.log('🔧 No matching domain, returning original:', thumbnailUrl);
    return thumbnailUrl;
  } catch (e) {
    console.warn(`⚠️ Error processing thumbnail URL, returning original:`, thumbnailUrl, e);
    return thumbnailUrl;
  }
}