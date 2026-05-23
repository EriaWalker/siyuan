1. 问题：选中被折叠的标题的父标题，子标题有时会选中，有时不会被选中，当父标题是最后一个父标题时，子标题不会被选中，当父标题不是最后一个父标题时，子标题会被选中
2. 问题：`当前 Outline 多选样式与 DocTree/FileTree 的选中样式不一致，导致视觉体验不统一`
3. 问题：在编辑器中选中含有多个标题的区域，对应的多个标题在outline中不会被选中
4. 问题：先普通左键点击一个 Outline 标题。再按住 `Ctrl/Cmd` 左键点击另一个标题。原来点击的标题选中状态会失效
5. 新功能：outline transformation with sub-heading功能有右键菜单ui入口但是不能进行批量操作，只支持单选，给批量标题操作添加该功能。该功能如果要实现也需要事务系统支持，尽量复用F:\SiYuan\siyuan\app\src\protyle\wysiwyg\transaction.ts中已有的代码，做实现功能所需的最小变动
6. 新功能：编辑器和outline内单选标题可以用快捷键Alt+数字修改标题等级，但是批量不支持，给批量标题操作添加该功能，复用标题批量upgrade/downgrade的函数
7. 新功能：复用当前已有的快捷键系统 给标题upgrade和downgrade添加快捷键为Alt + + 和 Alt + -
