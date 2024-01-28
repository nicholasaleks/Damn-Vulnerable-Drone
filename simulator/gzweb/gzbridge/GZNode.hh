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

#ifndef GZBRIDGE_GZNODE_HH_
#define GZBRIDGE_GZNODE_HH_

#include <node.h>
#include <node_object_wrap.h>

namespace gzweb
{
  using v8::FunctionCallbackInfo;
  using v8::Value;
  using v8::FunctionTemplate;
  using v8::Object;
  using v8::Persistent;

  class GazeboInterface;

  class GZNode : public node::ObjectWrap
  {
    public: static void Init(v8::Handle<v8::Object> exports);

    private: GZNode();

    private: ~GZNode();

    private: static void New(const FunctionCallbackInfo<Value>& args);

    private: static void LoadMaterialScripts(
        const FunctionCallbackInfo<Value>& args);

    private: static void SetConnected(
        const FunctionCallbackInfo<Value>& args);

    private: static void GetIsGzServerConnected(
        const FunctionCallbackInfo<Value>& args);

    private: static void GetMaterialScriptsMessage(
        const FunctionCallbackInfo<Value>& args);

    private: static void SetPoseMsgFilterMinimumDistanceSquared(
        const FunctionCallbackInfo<Value>& args);

    private: static void GetPoseMsgFilterMinimumDistanceSquared(
        const FunctionCallbackInfo<Value>& args);

    private: static void SetPoseMsgFilterMinimumQuaternionSquared(
        const FunctionCallbackInfo<Value>& args);

    private: static void GetPoseMsgFilterMinimumQuaternionSquared(
        const FunctionCallbackInfo<Value>& args);

    private: static void GetMessages(const FunctionCallbackInfo<Value>& args);

    private: static void Request(const FunctionCallbackInfo<Value>& args);

    private: static void SetPoseMsgFilterMinimumAge(
        const FunctionCallbackInfo<Value>& args);

    private: static void GetPoseMsgFilterMinimumAge(
        const FunctionCallbackInfo<Value>& args);

    private: GazeboInterface* gzIface = nullptr;

    private: bool isGzServerConnected = false;

  };
}

#endif
