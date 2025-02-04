import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/Home.vue'
import LoginPage from '../views/Login.vue'
import ProfilePage from '../views/Profile.vue'

const routes = [
    {
        path: '/',
        redirect: '/login'
    },
    {
        path: '/login',
        name: 'LoginPage',
        component: LoginPage
    },
    {
        path: '/home',
        name: 'HomePage',
        component: HomePage,
        meta: { requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'ProfilePage',
        component: ProfilePage,
        meta: { requiresAuth: true }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 导航守卫
router.beforeEach((to, from, next) => {
    const isAuthenticated = localStorage.getItem('userId')

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login')
    } else if (to.path === '/login' && isAuthenticated) {
        next('/home')
    } else {
        next()
    }
})

export default router 