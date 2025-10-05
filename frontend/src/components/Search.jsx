import { SearchBox } from '@mapbox/search-js-react';

const Search = (
  {
    accessToken,
    map,
    mapboxgl,
    value,
    onChange,
    onSelectedCoords,
    resetUI
  },

) => {
  const theme = {
    variables: {
      fontFamily: 'Avenir, sans-serif',
      borderRadius: '10px',
      boxShadow: '0 0 0 1px silver',
    }
  };
  return (
    <SearchBox
        accessToken={accessToken}
        map={map}
        mapboxgl={mapboxgl}
        value={value}
        onChange={onChange}
        className='search'
        onRetrieve={(res) => {
          // GeoJSON FeatureCollection
          const f = res.features?.[0];
          if (!f) return;
          const [lng, lat] = f.geometry.coordinates; // [longitude, latitude]
          const props = f.properties;
          console.log({ lng, lat });
          onSelectedCoords({ lng, lat, props});
        }}
        onClear={resetUI}
        theme={theme}
        marker
    />
  )
}

export default Search;