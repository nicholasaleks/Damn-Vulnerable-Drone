/*
 * Copyright 2013 Open Source Robotics Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
*/


#include <string>
#include <sstream>
#include <iostream>


#include "pb2json.hh"

using namespace google::protobuf;

namespace gzweb {

  std::string hex_encode(const std::string &input)
  {
    static const char* const lut = "0123456789abcdef";
    size_t len = input.length();

    std::string output;
    output.reserve(2 * len);
    for (size_t i = 0; i < len; ++i)
    {
      const unsigned char c = input[i];
      output.push_back(lut[c >> 4]);
      output.push_back(lut[c & 15]);
    }
    return output;
  }

  std::string pb2json(const Message &msg)
  {
    json_t *root = parse_msg(&msg);
    char *json = json_dumps(root, 0);
    std::string str(json);
    json_decref(root);
    delete json;
    return str;
  }

  std::string pb2json(Message *msg, const char *buf, int len)
  {
    std::string s (buf, len);
    msg->ParseFromString(s);
    json_t *root = parse_msg(msg);
    char *json = json_dumps(root, 0);
    std::string str(json);
    json_decref(root);
    delete json;
    return str;
  }

  json_t *parse_repeated_field(const Message *msg,
      const Reflection *ref,
      const FieldDescriptor *field)
  {
    size_t count = ref->FieldSize(*msg, field);
    json_t *arr = json_array();
    if(!arr)return NULL;
    switch(field->cpp_type())
    {
      case FieldDescriptor::CPPTYPE_DOUBLE:
        for(size_t i = 0 ; i != count ; ++i)
        {
          double  value1 = ref->GetRepeatedDouble(*msg, field, i);
          json_array_append_new(arr, json_real(value1));
        }
        break;
      case FieldDescriptor::CPPTYPE_FLOAT:
        for(size_t i = 0 ; i != count ; ++i)
        {
          float value2 = ref->GetRepeatedFloat(*msg, field, i);
          json_array_append_new(arr, json_real(value2));
        }
        break;
      case FieldDescriptor::CPPTYPE_INT64:
        for(size_t i = 0 ; i != count ; ++i)
        {
          int64_t value3 = ref->GetRepeatedInt64(*msg, field, i);
          json_array_append_new(arr,json_integer(value3)) ;
        }
        break;
      case FieldDescriptor::CPPTYPE_UINT64:
        for(size_t i = 0 ; i != count ; ++i)
        {
          uint64_t value4 = ref->GetRepeatedUInt64(*msg, field, i);
          json_array_append_new(arr, json_integer(value4));
        }
        break;
      case FieldDescriptor::CPPTYPE_INT32:
        for(size_t i = 0 ; i != count ; ++i)
        {
          int32_t value5 = ref->GetRepeatedInt32(*msg, field, i);
          json_array_append_new(arr, json_integer(value5));
        }
        break;
      case FieldDescriptor::CPPTYPE_UINT32:
        for(size_t i = 0 ; i != count ; ++i)
        {
          uint32_t value6 = ref->GetRepeatedUInt32(*msg, field, i);
          json_array_append_new(arr, json_integer(value6));
        }
        break;
      case FieldDescriptor::CPPTYPE_BOOL:
        for(size_t i = 0 ; i != count ; ++i)
        {
          bool value7 = ref->GetRepeatedBool(*msg,field,i);
          json_array_append_new(arr, value7 ? json_true() : json_false())  ;
        }
        break;
      case FieldDescriptor::CPPTYPE_STRING:
        for(size_t i = 0 ; i != count ; ++i)
        {
          std::string value8 = ref->GetRepeatedString(*msg, field, i);
          json_array_append_new(arr, json_string(value8.c_str()));
        }
        break;
      case FieldDescriptor::CPPTYPE_MESSAGE:
        for(size_t i = 0 ; i != count ; ++i)
        {
          const Message *value9 = &(ref->GetRepeatedMessage(*msg, field, i));
          json_array_append_new(arr, parse_msg(value9));
        }
        break;
      case FieldDescriptor::CPPTYPE_ENUM:
        for(size_t i = 0 ; i != count ; ++i)
        {
          const EnumValueDescriptor* value10
              = ref->GetRepeatedEnum(*msg, field, i);
          json_array_append_new(arr, json_integer(value10->number()));
        }
        break;
      default:
        break;
    }
    return arr;
  }

  json_t *parse_msg(const Message *msg)
  {
    const Descriptor *d = msg->GetDescriptor();
    if(!d)return NULL;
    size_t count = d->field_count();
    json_t *root = json_object();
    if(!root)return NULL;
    for (size_t i = 0; i != count ; ++i)
    {
      const FieldDescriptor *field = d->field(i);
      if(!field)return NULL;

      const Reflection *ref = msg->GetReflection();
      if(!ref)return NULL;
      const char *name = field->name().c_str();
      if(field->is_repeated())
        json_object_set_new(root, name, parse_repeated_field(msg, ref, field));
      if(!field->is_repeated() && ref->HasField(*msg, field))
      {
        double value1;
        float value2;
        int64_t value3;
        uint64_t value4;
        int32_t value5;
        uint32_t value6;
        bool value7;
        std::string value8;
        const Message *value9;
        const EnumValueDescriptor *value10;

        switch (field->cpp_type())
        {
          case FieldDescriptor::CPPTYPE_DOUBLE:
            value1 = ref->GetDouble(*msg,field);
            if (value1 != value1)
              value1 = 0;
            json_object_set_new(root,name,json_real(value1));
            break;
          case FieldDescriptor::CPPTYPE_FLOAT:
            value2 = ref->GetFloat(*msg,field);
            if (value2 != value2)
              value2 = 0;
            json_object_set_new(root,name,json_real(value2));
            break;
          case FieldDescriptor::CPPTYPE_INT64:
            value3 = ref->GetInt64(*msg,field);
            json_object_set_new(root,name,json_integer(value3)) ;
            break;
          case FieldDescriptor::CPPTYPE_UINT64:
            value4 = ref->GetUInt64(*msg,field);
            json_object_set_new(root,name,json_integer(value4));
            break;
          case FieldDescriptor::CPPTYPE_INT32:
            value5 = ref->GetInt32(*msg,field);
            json_object_set_new(root,name,json_integer(value5));
            break;
          case FieldDescriptor::CPPTYPE_UINT32:
            value6 = ref->GetUInt32(*msg,field);
            json_object_set_new(root,name,json_integer(value6));
            break;
          case FieldDescriptor::CPPTYPE_BOOL:
            value7 = ref->GetBool(*msg,field);
            json_object_set_new(root,name,value7?json_true():json_false())  ;
            break;
          case FieldDescriptor::CPPTYPE_STRING:
            if (field->type() == FieldDescriptor::TYPE_BYTES)
              value8 = hex_encode(ref->GetString(*msg,field));
            else
              value8 = ref->GetString(*msg,field);
            json_object_set_new(root,name,json_string(value8.c_str()));
            break;
          case FieldDescriptor::CPPTYPE_MESSAGE:
            value9 = &(ref->GetMessage(*msg,field));
            json_object_set_new(root,name,parse_msg(value9));
            break;//FIXME : parse Message
          case FieldDescriptor::CPPTYPE_ENUM:
            value10 = ref->GetEnum(*msg,field);
            json_object_set_new(root,name,json_integer(value10->number()));
            break;
          default:
            break;
        }
      }
    }
    return root;
  }

  std::string get(json_t *obj, const std::string &key)
  {
    if (key.empty())
      return "";

    std::string keyToken = key;
    std::string keyRest = key;
    std::size_t pos = key.find(":");
    if (pos != std::string::npos)
    {
      keyToken = key.substr(0, pos);
      keyRest = key.substr(pos+1);
    }
    json_t *data = json_object_get(obj, keyToken.c_str());

    if (json_is_object(data))
    {
      return get(data, keyRest);
    }
    else if(json_is_string(data))
    {
      const char *result = json_string_value(data);
      return std::string(result);
    }
    else if (json_is_real(data))
    {
      std::stringstream ss;
      ss << json_real_value(data);
      return ss.str();
    }
    else if (json_is_integer(data))
    {
      std::stringstream ss;
      ss << json_integer_value(data);
      return ss.str();
    }
    else if (json_is_true(data))
    {
      std::stringstream ss;
      ss << "1";
      return ss.str();
    }
    else if (json_is_false(data))
    {
      std::stringstream ss;
      ss << "0";
      return ss.str();
    }
    else if (json_is_array(data))
    {
      // TODO: only gets the first element in array and treats it as string
      // Need a more generic get_array function later.
      std::stringstream ss;
      ss << json_string_value(json_array_get(data, 0));
      return ss.str();
    }

    return "";
  }

  std::string get_value(const std::string &msg, const std::string &key)
  {
    json_t *root;
    json_error_t error;
    root = json_loads(msg.c_str(), 0, &error);
    std::string result = get(root, key);
    json_decref(root);
    return result;
  }
}
