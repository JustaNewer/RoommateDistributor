import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Profile from '../views/Profile.vue'
import CreatedDorms from '../views/CreatedDorms.vue'
import PersonalityTest from '../views/PersonalityTest.vue'
import DormDetail from '../views/DormDetail.vue'
import SearchResults from '../views/SearchResults.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
        meta: { requiresAuth: true }
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { requiresGuest: true }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: Profile,
        meta: { requiresAuth: true }
    },
    {
        path: '/created-dorms',
        name: 'CreatedDorms',
        component: CreatedDorms,
        meta: { requiresAuth: true }
    },
    {
        path: '/personality-test',
        name: 'PersonalityTest',
        component: PersonalityTest,
        meta: { requiresAuth: true }
    },
    {
        path: '/dorm/:id',
        name: 'DormDetail',
        component: DormDetail,
        meta: { requiresAuth: true }
    },
    {
        path: '/search-results',
        name: 'SearchResults',
        component: SearchResults,
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