#ifndef GZBRIDGE_CONFIG_LOADER_HH_
#define GZBRIDGE_CONFIG_LOADER_HH_

#include <map>
#include <vector>
#include <cassert>
#include <string>
#include <iostream>

namespace gzweb
{
  class ConfigNode;

	class ConfigLoader
	{
	public:
		static void loadAllFiles(ConfigLoader* c, const std::string& path);

		ConfigLoader(const std::string& fileEnding);
		virtual ~ConfigLoader();

		std::string m_fileEnding;

		// For a line like
		// entity animals/dog
		// {
		//    ...
		// }
		// The type is "entity" and the name is "animals/dog"
		// Or if animal/dog was not there then name is ""
		virtual ConfigNode *getConfigScript (const std::string &name);

		virtual std::map <std::string, ConfigNode*> getAllConfigScripts ();

		virtual void parseScript(std::ifstream &stream);


	protected:

		float m_LoadOrder;
		// like "*.object"

		std::map <std::string, ConfigNode*> m_scriptList;

		enum Token
		{
			TOKEN_Text,
			TOKEN_NewLine,
			TOKEN_OpenBrace,
			TOKEN_CloseBrace,
			TOKEN_EOF,
		};

		Token tok, lastTok;
		std::string tokVal, lastTokVal;

		void _parseNodes(std::ifstream &stream, ConfigNode *parent);
		void _nextToken(std::ifstream &stream);
		void _skipNewLines(std::ifstream &stream);

		virtual void clearScriptList();
	};

	class ConfigNode
	{
	public:
		ConfigNode(ConfigNode *parent, const std::string &name = "untitled");
		~ConfigNode();

		inline void setName(const std::string &name)
		{
			this->m_name = name;
		}

		inline std::string &getName()
		{
			return m_name;
		}

		inline void addValue(const std::string &value)
		{
			m_values.push_back(value);
		}

		inline void clearValues()
		{
			m_values.clear();
		}

		inline std::vector<std::string> &getValues()
		{
			return m_values;
		}

		inline const std::string &getValue(unsigned int index = 0)
		{
			assert(index < m_values.size());
			return m_values[index];
		}

		ConfigNode *addChild(const std::string &name = "untitled", bool replaceExisting = false);
		ConfigNode *findChild(const std::string &name, bool recursive = false);

		inline std::vector<ConfigNode*> &getChildren()
		{
			return m_children;
		}

		inline ConfigNode *getChild(unsigned int index = 0)
		{
			assert(index < m_children.size());
			return m_children[index];
		}

		void setParent(ConfigNode *newParent);

		inline ConfigNode *getParent()
		{
			return m_parent;
		}

	private:
		std::string m_name;
		std::vector<std::string> m_values;
		std::vector<ConfigNode*> m_children;
		ConfigNode *m_parent;

		int m_lastChildFound;  //The last child node's index found with a call to findChild()

		std::vector<ConfigNode*>::iterator _iter;
		bool _removeSelf;
	};

}

#endif
