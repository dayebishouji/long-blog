export interface Friend {
  avatar?: string; // 头像链接
  name: string; // 用户 id
  link: string; // 博客链接
  title?: string; // 用户头衔
  tag?: string; // 用户标签
  color?: string; // 标签颜色
  isMe?: boolean; // 是否是自己
}

export const friendsInfo: Friend[] = [
  {
    avatar:
      'https://avatars.githubusercontent.com/u/131654682?s=400&u=ed720a6f69a8ac86841782b2116ca831ce9e323a&v=4',
    name: 'Long',
    title: '努力努力再努力',
    tag: 'Back-End Developer | 龙',
    link: '欢迎交换友链！可参考此处信息',
    color: 'sky',
    isMe: true
  }
];
