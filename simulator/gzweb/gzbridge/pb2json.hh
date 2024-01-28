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

#ifndef GZBRIDGE_PB2JSON_HH_
#define GZBRIDGE_PB2JSON_HH_

#include <google/protobuf/descriptor.h>
#include <google/protobuf/message.h>
#include <jansson.h>

namespace gzweb
{
  std::string pb2json(const google::protobuf::Message &msg);

  std::string pb2json(google::protobuf::Message *msg,const char *buf,int len);

  std::string get_value(const std::string &msg, const std::string &key);

  json_t *parse_msg(const google::protobuf::Message *msg);

  json_t *parse_repeated_field(const google::protobuf::Message *msg,
      const google::protobuf::Reflection *ref,
      const google::protobuf::FieldDescriptor *field);
}

#endif
