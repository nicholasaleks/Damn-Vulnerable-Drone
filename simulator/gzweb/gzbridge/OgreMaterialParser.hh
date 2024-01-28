#ifndef GZBRIDGE_OGREMATERIALPARSER_HH_
#define GZBRIDGE_OGREMATERIALPARSER_HH_

#include <string>

namespace gzweb
{
  class ConfigNode;
  class ConfigLoader;

  class OgreMaterialParser
  {
    public: OgreMaterialParser();

    public: virtual ~OgreMaterialParser();

    public: void Load(const std::string &_path);

    public: std::string GetMaterialAsJson() const;

    private: ConfigLoader *configLoader = nullptr;
  };

}

#endif
