<template>
  <div class="flex items-center justify-center py-4">
    <div class="dark:bg-stone-950 h-full rounded-md">
      <div
        class="items-start justify-center gap-6 rounded-lg p-2 md:p-8 grid grid-cols-1"
      >
        <div class="col-span-1 grid items-start gap-6 lg:col-span-1">
          <div>
            <div class="texture-card">
              <div
                class="texture-card-header flex flex-col gap-1 items-center justify-center p-4"
              >
                <div class="p-3 bg-neutral-950 rounded-full mb-3">
                  <MergeIcon class="h-7 w-7 stroke-neutral-200" />
                </div>
                <h3 class="texture-card-title">Create your account</h3>
                <p class="text-center">
                  Welcome! Please fill in the details to get started.
                </p>
              </div>

              <div class="texture-separator"></div>

              <div class="texture-card-content">
                <div class="flex justify-center gap-2 mb-4">
                  <button class="texture-button icon-button">
                    <GoogleIcon />
                    <span class="pl-2">Google</span>
                  </button>
                  <button class="texture-button icon-button">
                    <GithubIcon />
                    <span class="pl-2">Github</span>
                  </button>
                </div>

                <div class="text-center text-sm mb-4">or</div>

                <form
                  @submit.prevent="handleSubmit"
                  class="flex flex-col gap-6"
                >
                  <div class="flex justify-between gap-2">
                    <div>
                      <label for="first">First name</label>
                      <input
                        id="first"
                        v-model="formData.firstName"
                        type="text"
                        required
                        class="input-field"
                      />
                    </div>
                    <div>
                      <label for="last">Last Name</label>
                      <input
                        id="last"
                        v-model="formData.lastName"
                        type="text"
                        required
                        class="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label for="username">Username</label>
                    <input
                      id="username"
                      v-model="formData.username"
                      type="text"
                      required
                      class="input-field"
                    />
                  </div>

                  <div>
                    <label for="email">Email</label>
                    <input
                      id="email"
                      v-model="formData.email"
                      type="email"
                      required
                      class="input-field"
                    />
                  </div>

                  <div>
                    <label for="password">Password</label>
                    <input
                      id="password"
                      v-model="formData.password"
                      type="password"
                      required
                      class="input-field"
                    />
                  </div>
                </form>
              </div>

              <div class="texture-separator"></div>

              <div class="texture-card-footer border-b rounded-b-sm">
                <button
                  @click="handleSubmit"
                  class="texture-button accent w-full"
                >
                  <div class="flex gap-1 items-center justify-center">
                    Continue
                    <ArrowRightIcon class="h-4 w-4 text-neutral-50 mt-[1px]" />
                  </div>
                </button>
              </div>

              <div
                class="dark:bg-neutral-800 bg-stone-100 pt-px rounded-b-[20px] overflow-hidden"
              >
                <div class="flex flex-col items-center justify-center">
                  <div class="py-2 px-2">
                    <div class="text-center text-sm">
                      Already have an account?
                      <span
                        class="text-primary cursor-pointer"
                        @click="goToSignIn"
                        >Sign in</span
                      >
                    </div>
                  </div>
                </div>
                <div class="texture-separator"></div>
                <div class="flex flex-col items-center justify-center">
                  <div class="py-2 px-2">
                    <div class="text-center text-xs">Secured by Supabase</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { MergeIcon, ArrowRightIcon } from "lucide-vue-next";
import GoogleIcon from "./icons/GoogleIcon.vue";
import GithubIcon from "./icons/GithubIcon.vue";

const formData = ref({
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
});

const handleSubmit = () => {
  // 处理表单提交逻辑
  console.log("Form submitted:", formData.value);
};

const goToSignIn = () => {
  // 处理跳转到登录页面的逻辑
};
</script>

<style scoped>
.texture-card {
  @apply bg-white dark:bg-neutral-900 rounded-[20px] border border-neutral-200 dark:border-neutral-800;
}

.texture-card-title {
  @apply text-2xl font-semibold tracking-tight;
}

.texture-separator {
  @apply h-px bg-neutral-200 dark:bg-neutral-800;
}

.input-field {
  @apply w-full px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-800/80 placeholder-neutral-400 dark:placeholder-neutral-500;
}

.texture-button {
  @apply flex items-center justify-center px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors;
}

.texture-button.accent {
  @apply bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900 border-none hover:bg-neutral-800 dark:hover:bg-neutral-200;
}

.icon-button {
  @apply gap-2;
}
</style> 