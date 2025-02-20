import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/Home.vue'
import LoginPage from '../views/Login.vue'
import ProfilePage from '../views/Profile.vue'
import PersonalityTest from '../views/PersonalityTest.vue'

const routes = [
    {
        path: '/',
        name: 'Root',
        component: HomePage,  // 直接使用 HomePage 作为根路径组件
        meta: { requiresAuth: true }  // 需要登录才能访问
    },
    {
        path: '/login',
        name: 'LoginPage',
        component: LoginPage,
        meta: { requiresGuest: true }  // 只允许未登录用户访问
    },
    {
        path: '/home',
        name: 'HomePage',
        component: HomePage,
        meta: { requiresAuth: true }  // 需要登录才能访问
    },
    {
        path: '/profile',
        name: 'ProfilePage',
        component: ProfilePage,
        meta: { requiresAuth: true }  // 需要登录才能访问
    },
    {
        path: '/personality-test',
        name: 'PersonalityTest',
        component: PersonalityTest,
        meta: { requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',  // 捕获所有未匹配的路由
        redirect: '/'  // 重定向到根路径
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 导航守卫
router.beforeEach((to, from, next) => {
    const isAuthenticated = localStorage.getItem('userId')

    // 需要登录的页面
    if (to.meta.requiresAuth && !isAuthenticated) {
        next({
            path: '/login',
            query: { redirect: to.fullPath }  // 保存用户想要访问的页面路径
        })
        return
    }

    // 只允许未登录用户访问的页面（如登录页）
    if (to.meta.requiresGuest && isAuthenticated) {
        next('/')  // 改为重定向到根路径
        return
    }

    next()
})

export default router 