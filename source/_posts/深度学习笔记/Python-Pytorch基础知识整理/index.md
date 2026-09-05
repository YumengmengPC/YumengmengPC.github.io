---
title: Python+Pytorch基础知识整理
top: false
hidden: false
cover: images/cover_python_and_pytorch.webp
toc: true
mathjax: true
date: 2026-07-13 18:53:12
password:
description: Python 与 PyTorch 基础知识整理。
tags:
  - Python
  - PyTorch
  - 深度学习
categories: [深度学习笔记]
---

## 前言

这里是笔者对 python + pytorch 基础知识的一些整理，供笔者复习也供看到此篇 blog 的uu了解并查阅 python 的基础知识~写这篇博客的目的是：虽然现在已经完全没有必要在项目中大量使用手写代码，且AI可以很好地帮助你完成大部分的代码工作，但笔者认为：在**AI编程时代**下最重要的是**写代码的思路**以及**调试代码的能力**。学习阶段一些必要的手写代码是必要的，它可以很好地帮助你了解语言特性，理解算法思想。我们可以不会手撕红黑树，但我们仍需拥有看懂红黑树代码的能力。

默认的 python 版本为 python3 ，即新版 python，不包含"如何安装 python 环境"之类的问题，仅包含笔者认为必要的语法知识。

---
## python 六大数据类型及其增删查改：

python 里边有六大数据类型：数值、字符串、列表、字典、元组、集合

### 数值类型(int、float、complex)

python 中数值类型主要包含了**整型** `int`、**浮点型** `float`以及**复数** `complex`三大类型。其实还有一个布尔类型 `bool` 主要用于逻辑判断( true 的值为1、 false 的值为0)，属于**整型** `int` 的**子类**比较简单。

**整型** `int` 用于表示不含**小数点**的数：正整数、负整数和零。例如5、-3、0。

**浮点型** `float` 由**整数部分**与**小数部分**组成，但由于是近似存储，可能存在精度误差。例如 3.14、-0.001、1.8e3 (表示 1.8 * 10^3 = 1800 )。最后者属于科学计数法表示浮点型数据。在实现上遵循了 IEEE754 标准

**复数型** `complex` 由**实数部分**和**虚数部分**组成，用 `a + bj` 或者是 `complex(a,b)` 表示。其中：`a` 是实部，`b` 是虚部。运算遵循复数运算规则。

以上是三大类型的定义。当你不确定一个变量是什么类型的时候，可以使用 `print(type(a))` 来确定其类型，其将会在控制台上打印 `a` 的类型。

#### 三大类型的运算

对于**整型** `int` 而言，运算过程中如果出现了小数点，**不会**直接舍弃小数点之后的内容，而是会将运算结果隐式转换为浮点型。这一点是跟 cpp 的区别

例如
```python
a = 2 # <class 'int'>
b = 2 # <class 'int'>
f = a/b # <class 'float'>, f = 1.0
f = a//b # <class 'int'>, f = 1
c = 2.0 # <class 'float'>
f = c//a # <class 'float'> f = 1.0
```
其中 `/` 作为 python 中的**除法**操作，运算遵循数学运算规则，`//` 作为 python 中的"整除"操作，遵循一种名为"类型提升"的原则。即 `//` 执行的是整除逻辑(向下取整)，但是 python 会保证输出类型的一致性。如果是两个 `int` 类型整除的话，返回值也会是 `int` 类型；但如果是一个 `int` 类型与一个 `float` 类型做整除的话，python 就会把原本应该返回的 `int` 类型**提升**至 `float` 类型，尽管 `1.0` 与 `1` 并无数值上的差别（浮点数误差忽略不计）。

常见的运算有加法 `+`、减法 `-`、乘法 `*`、除法 `/`、乘幂 `**`、取余 `%`、整除 `//`。除此之外，python 也有类似于 cpp 的强制类型转换与规范输出。
格式化字符包含以下：

| 格式化字符 |   含义    |
| :---: | :-----: |
|  %c   |  字符类型   |
|  %s   |  字符串类型  |
|  %d   | 十进制整数类型 |
|  %f   |  浮点数类型  |

代码例子如下:

```python
a = 1.23456789 # <class 'float'>
b = int(a) # <class 'int'> 将浮点数转化为整型 只保留整数部分
print("a的值是%f" % (a)) #默认输出保留小数点后六位
print("a的值是%.3f" % (a)) #输出保留3位
print(f"a的值是{a:.2f}") #输出保留2位,属于f-string语法
```

对于**浮点型** `float` 而言，基本只需要注意浮点数的存储与运算都是**不精确**的，例如：
```python
a = 0.1
b = 0.2
c = a + b # c = 0.30000000000000004 精度越高误差越大
```

对于**复数** `complex` 而言，基本的运算规则如下：
```python
a = 1 # <class 'int'>
b = 2 # <class 'int'>
c = a + b * 1j # <class 'complex'> 注意j前面一定要跟一个数字字面量
# c = a + bj 这种方式会报错，python将"bj"视作未定义变量
c = complex(a, b) # <class 'complex'> 这种定义方式更标准，更好
```

对于**布尔类型** `bool` 而言，由于 `bool` 类型是 `int` 类型的一个**子类**，所以会遵循很多 `int` 类型的计算规则。

**布尔类型**有两个主要关键字：`True` 与 `False`，其中 `True` 的值恒为 `1`，`False` 的值恒为 `0`，`True` 跟 `False`都可以参与整数运算，参与整数运算之后返回值也是整型。并且布尔类型也可以执行强制类型转换，`bool(0)` 返回的是 `False`；`bool(1)` 返回的是 `True`。你也可以尝试 `bool(2)` 或者 `bool(-1)`。在布尔类型中，所有**非零数值**都被视为 `True`，而零则会被视为 `False`。
### string字符串类型

创建字符串可以使用单引号、双引号、三单引号以及三双引号来创建。其中三引号支持多行定义字符串(不常用)。Python 并不支持**单字符类型**，单字符也会在 Python 中作为一个**字符串**类型 `str` 来使用。**三双引号在 python 中也可用作多行注释**

**字符串**是由数字、字母、下划线组成的一串字符，例如:
```python
a = "acc_test"
```

上述代码在计算机中的执行顺序为：1.在内存中创建一个字符串 `acc_test`；2.在程序栈寄存器中创建一个变量 `a`；3.把字符串 `acc_test` 的内存地址赋值给 `a`

这里的 `a` 就是一个字符串，并且字符串支持双向索引访问，即你可以通过0、1、2...来访问 `a` 的第1、2、3...个字符；也可以通过-1、-2、-3...来访问 `a` 的**倒数**第1、2、3...个字符。还可以通过**切片**语法来执行选择。切片语法为 `str[start:end:step]`，如果只有两个参数那么 `step` 默认为`1`。并且切片区间**左闭右开**，即 `str[start]` 会被成功选中，但 `str[end]` 将会被跳过。
```python
a = "acc_test"
# a[0] = 'a' 顺序访问
# a[1] = 'c'
# a[2] = 'c'
# ...
# a[-1] = 't' 逆序访问
# a[-2] = 's'
# a[-3] = 'e'
# ...
print(a[::]) # acc_test
print(a[1::]) # cc_test
print(a[1:3]) # cc
print(a[2::2]) # cts
```

字符串也支持加法 `+` 运算，运算结果为两个字符串无缝拼接。
```python
str1 = "a"
str2 = "b"
str3 = str1 + str2 # str3 = 'ab'
```

以下代码也可以证实字符串赋值在计算机中的执行顺序为：1.在内存中创建一个字符串；2.在程序栈寄存器中创建一个变量；3.把字符串的内存地址赋值给对应变量。
```python
str1 = "hello world"
print(id(str1))
str1 = "aaaa"
print(id(str1))
# 第一次执行跟第二次执行输出的内存地址不同
```

### 列表(list)

列表 `List` 几乎是python中使用最频繁的数据类型。列表是写在方括号之间，用逗号隔开的元素列表，其中元素的类型可以各不相同：可以是数字、字符串、甚至是嵌套的**列表**

例如`my_list = [1, 3.14, "a", [1,2,3]]`
其中`my_list[0] = 1`，`my_list[1] = 3.14`，`my_list[2] = "a"`，`my_list[3] = [1, 2, 3]`

列表也可以利用其嵌套性质创建矩阵，例如:
```python
a = [[1, 2],
	 [3, 4]]
```
这样就创建了一个 2 \* 2 矩阵 `a`。

与字符串类似，列表也支持双向索引访问，或者是**切片**访问，或者是两个列表**拼接**到一起的加法。
```python
list1 = [1, 2, 3, 4, 5, 6, 7, 8]
print(list1[1:]) # [2, 3, 4, 5, 6, 7, 8]
print(list1[1::2]) # [2, 4, 6]
list2 = [9, 10, 11, 12, 13, 14, 15]
list3 = list1 + list2 # list3 = [1, 2, ..., 14, 15] 
```

列表可以用 `list(range())` 关键字来快速创建，如 `a = list(range(0,10))` 可以创建一个 `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]` 的列表。

需要与**字符串**类型区分的是：列表属于**变量**，而字符串属于**字面量**，二者的区别在于**可变与否**。字符串一旦创建就不能进行直接修改，只能在内存上再分配一个字面量然后将其地址赋值。而列表创建之后仍然可以修改，通过索引访问修改或通过一些增改删函数修改都是允许的。

假设列表定义成了 `my_list`，那么列表的一些相关增删查改函数如下：

|             关键字              |     作用     |
| :--------------------------: | :--------: |
|      my_list.append(x)       | 在列表末尾添加一个x |
|      my_list.remove(x)       |  删除索引为x的数  |
|         max(my_list)         | 返回列表中最大的数值 |
|         min(my_list)         | 返回列表中最小的数值 |
|        my_list.sort()        | 将列表按照升序排列  |
| my_list.sort(reverse = True) | 将列表按照降序排列  |
```python
a = list(range(0,5)) # [0, 1, 2, 3, 4]
a.append(5) # [0, 1, 2, 3, 4, 5]
```

### 元组(tuple)

**列表** `list` 使用方括号 `[]` 来定义，而**元组** `tuple` 使用圆括号`()`来定义。元组其实性质与列表类似，最重要的区别在于**元组内的元素不可被修改**，这提高了代码的内存安全性与可读性。
```python
my_tuple = (1, 2, 3, 4)
```
上述代码定义了一个 `my_tuple` 元组，与字符串、列表类似：元组也可以使用**双向索引**来访问元组中的元素。并且元组也是可以通过**切片**语法进行访问的。

**需要注意的是**如果元组中只有一个元素那么定义的时候需要加上逗号，否则 python 解释器会将其理解为数值类型。
```python
tuple_x = (1,) # <class 'tuple'>
fake_tuple = (1) # <class 'int'>
```

能够被访问并不意味着能够被**修改**，尝试对元组数据进行修改将会引发 python 报错。所有需要确保数据不会被修改的场景都应该使用**元组**定义

一些经典操作如下：(假设前面已经定义了一个 `my_tuple` 元组)
```python
my_tuple[1:] # (2, 3, 4)
my_tuple.count(1) # 统计元组 my_tuple 中包含了多少个'1'
my_tuple.index(2) # 返回元组 my_tuple 中'2'最先出现的索引
```

### 集合(set)

**集合**类型 `set` 是一个**无序**、**不重复**元素的序列，与数学概念上的集合类似，使用大括号`{}`或者是 `set()` 函数来创建。

`my_set = {1, 2, 3, 4}` 直接用大括号创建。

`my_set = set([1, 2, 3, 4])` 在 `set()` 函数中输入一个列表来创建相对应的集合。

**空集**只能通过`set()`来创建，因为`{}`将会返回一个空字典。

**无序**意味着集合中的元素没有顺序，因此**不能够**通过索引或**切片**访问集合中元素。

**不重复**意味着集合中**不允许**出现重复元素，但在定义集合的时候可以加入重复元素， python 解释器将会对重复元素自动去重。

常见的集合操作包括以下：
```python
set1 = {1, 2, 3}
set2 = {3, 4, 5}
#交集
print(set1 & set2) # {3}

#并集
print(set1 | set2) # {1, 2, 3, 4, 5}

set1.add(5) # set1 = {1, 2, 3, 5}
set2.remove(4) #set2 = {3, 5}
del set1 # 删除 set1 这个集合
# 在删除 set1 后再尝试对 set1 进行操作将会引发报错
```
### 字典(dict)

字典是一种类似于哈希表的**映射类型**，可以存储任意类型的元素，其元素是一种**键值对**。每个键 `key` 在字典中都是唯一的，并且键必须是**不可变类型**，如数字、字符串、元组等，但值可以是**任意类型的数据**。

字典同样使用大括号 `{}` 来创建，其中每个元素由键值对组成。键与值之间通过冒号 `:` 分隔，每个键值对之间用逗号 `,` 分隔，创建空字典时可以用 `{}` 来创建。

```python
# 创建一个字典
my_dict = {"name": "01", "age": 18, "height": "185"}
```

访问字典可以通过访问字典中的**键**进行，通过**键**来访问字典中的值。
```python
print(my_dict["name"]) # 01
print(my_dict["age"]) # 18
```

一些字典的典型操作如下：
```python
my_dict["IQ"] = 250 # 增
del my_dict["IQ"] # 删
my_dict["height"] = 190 # 改
my_dict["height"] # 查，返回190
my_dict_2 = {"name": "01", "age": 18, "height": "185", "name": "02"}
# my_dict_2 = {"age": 18, "height": "185", "name": "02"}，字典也会自动去重，对于一个键对多个值的定义，始终以最后一个定义的键值对为准。
keys = my_dict.keys() # 获取所有键
values = my_dict.values() # 获取所有值
```

## python 中的程序结构

python 中有三大程序结构：顺序结构、分支结构、循环结构。这一点跟 cpp 还是比较类似的（应该说所有计算机语言的底层程序结构都是这三个？），不过在语法表达上还是有一些区别的：比如 cpp 使用大括号 `{}` 来界定代码块，而 Python 依赖缩进界定代码块等等。

### 分支结构
```python
# 单分支结构
a = 1
if a > 0:
	b = 1
else:
	b = 0

# 多分支结构
a = 1
b = 1
if a > 0 and b > 0: # 逻辑上的且
	c = 1
elif a < 0 or b < 0: # 逻辑上的或
	c = 2
else:
	c = 3
```
`if else` 结构也可以嵌套使用

### 循环结构

以下是 `while` 循环的一些使用方法：
```python
# 一个简单的计数器
a = 0
while a < 10:
	print(a)
	a += 1
# 死循环打印，输入不是正整数时退出
while True:
	a = int(input("请输入一个正整数："))
	print(f"你输入的数字是{a}")
	if a <= 0:
		break
```

以下是 `for` 循环的一些使用方法：
```python
# for语法格式为 for 变量名 in 可迭代对象:
for i in range(10):
	print(i)

my_list = [1, 2, 3]
for i in my_list:
	print(i) # 这里的 i 相当于 my_list[i]

my_dict = {'a': 1, 'b': 2}
for key in my_dict:
	print(key)

for key, value in my_dict.items():
	print(f"键:{key}, 值:{value}")

for index, (key, value) in enumerate(my_dict.items()):
	print(index, key, value)

my_str = "Python"
for char in my_str:
	print(char)
```

## 函数

python 中的函数定义也跟 cpp 类似，函数的思想是封装一段未来将会多次复用的代码，实现模块化的编程。定义函数需要指定**函数名**、**参数**、**函数体**；调用函数的时候只需要提供函数名跟所需参数。

**形式参数**：定义函数时小括号内的参数，用来接收传入值。
**实际参数**：调用函数时小括号内的参数，传递给函数使用。

函数执行结束后，如果有 `return` 语句，则会返回结果给函数调用处。

**匿名函数**：函数名 = `lambda` 参数: 表达式
```python
fun = lambda a,b:a+b
fun(1,2) # return 3
```

函数内部允许定义**局部变量**，局部变量只在函数执行期间存在，并且只在函数内部可见。函数执行完毕时会释放局部变量占用的内存空间。

与局部变量相对应的是**全局变量**，全局变量在整个程序中可见。一旦被定义就可以在整个程序中被访问与修改。全局变量的作用域是整个程序，它的生命周期是整个程序从运行到结束的这段时间内。

python 中的函数也支持**递归**，即允许在函数体内调用函数本身。递归需要有以下特性：
1、递归必须有明确的结束条件。
2、每进入更深一层的递归时，问题规模应该比上次递归有所减少。
3、递归函数的执行效率不高，层次太多会导致**栈溢出**

## Python中的面向对象编程

python 是一门**面向对象**的编程语言，java、cpp 等都属于面向对象的编程语言，具有面向对象的四大特性：**封装**、**继承**、**多态**、**抽象**。

与面向对象编程相对应的是**面向过程**编程，最经典的是**C语言**，不过挺多现代编程语言基本上同时支持面向过程编程与面向对象编程。

### 类和对象

**类**是具有相同属性和功能的一类事物，**对象**则是**类**的具体体现。二者是**面向对象编程**的核心。
例如：动物类可以包含猫、狗、鸟等对象；植物类可以包含西红柿、马铃薯等对象。

自定义一个类可以用以下语法结构：
```python
class 类名():
	pass # 包含方法与属性, pass 可以作为占位符避免语法错误
```

在我们自定义了一个类之后，可以用以下语法格式创建对象：
```python
对象名 = 类名()
```

例如:
```python
class Person():
	pass

people = Person()
print(type(people)) # <class '__main__.Person'> 
```

### 类中的属性与方法

**属性**：对象的特征描述，本质是在类里面定义的**变量**。
**方法**：对象具有的行为，本质是在类里面定义的**函数**，包含以下：
* **类属性**：定义在类中、方法之外，可以通过 `类名.属性名` 来访问
* **实例属性**：从属于实例对象的属性，在 `__init__()` 方法中通过 `self.实例属性名 = 初始值` 
* **实例方法**：定义在类中的函数，且自带参数 `self`
* **类方法**：使用装饰器 `@classmethod` 声明，第一个参数通常被命名为 `cls`，它指向类而不是实例
* **静态方法**：使用装饰器 `@staticmethod` 声明，是类中的独立函数

```python
class Person():
	height = 185 # 类属性
	weight = 140 # 类属性
	def __init__(self,name,age): # 初始方法，name,age是方法参数
		self.name = name         # self指向实例本身
		self.age = age
	def sing(self): # 实例方法
		print("啦啦啦")
	def jump(self): # 实例方法
		print("我能跳2米高")
	def show(self): # 实例方法
		print(f"我是{self.name},今年{self.age}岁") # 必须使用实例属性
	# 类方法 不能使用实例属性与实例方法，cls指向整个类	
	@classmethod
	def class_method(cls):
		print(f"我的身高是{cls.height}")
	# 静态方法 没有访问类或者实例的特殊参数。
	@staticmethod
	def add(a,b):
		result = a + b
		return result
	

person = Person("01", 18) # 定义一个类
print(Person.height) # 调用类属性
print(person.name) # 实例属性，使用对象名加.即可调用
person.show() # 实例方法
Person.class_method() # 类方法
Person.add(1,2) # 静态方法
```

### 面向对象编程三大特性：封装、继承、多态

#### 封装

封装几乎是面向对象编程中**最重要**的特性了，封装就是将数据与功能整合在一起。针对封装到对象或者类中的属性，可以严格控制在类外部对它们的访问。即**隐藏属性**与**开放接口**。封装主要通过**私有属性**和**公共方法**实现。有了封装之后使用者可以无需了解类的内部实现细节而通过接口来操作对象。

##### 访问限制

* **单下划线开头**：表示属性或方法是”受保护的“，在类的内部与子类中可以被访问，但不建议直接访问。
* **双下划线开头**：表面属性或方法是”私有的“，只能在类的内部中被访问，外部无法直接访问
* **双下划线开头和结尾**：这些方法在类或对象进行特定操作时会字典被调用，支持重载，给自定义类添加各种特殊功能。如 `__init__` 和 `__del__`。

```python
class Person():
	def __init__(self,name,age,height):
		self._name = name # 受保护的，只能被本类和子类访问
		self.__age = age # 私有的，只能在类的内部访问呢
		self.height = height # 实例属性，类的内部、外部、子类都可以访问

person5 = Person("01", 18, 185)
print(person5._name) # 调用受保护的实例方法
# print(person5.__age) 调用私有的实例属性将会引发报错
print(person5._Person__age) # 会输出私有属性，但是不推荐使用
dir(person5) # 查看对象的所有属性与方法
```

#### 继承

继承是一种类与类之间的关系，描述了一个类从另一个类获取成员（属性和方法）的信息。实现继承的类被称为**子类**，被继承的类称为**父类**。继承使得子类具有父类的各种属性与方法，这样就不需要在子类中重复编写相同的代码，能够提高代码的复用性。

##### 继承的特性

* **一个子类可以继承多个父类**：python 支持多重继承，即一个类可以继承多个类的属性与方法
* **一个父类可以有多个子类**：一个父类可以被多个子类所继承，形成类的层次结构。
* **默认继承 `object` 类**：如果一个类没有显式继承任何类，那么会默认继承 python 的根类 `object`。

继承的格式如下：
```python
class ParentClass():
	pass # 父类的属性和方法

class ChildClass(ParentClass):
	pass # 子类的属性和方法
```

一些**继承**特性的例子：
```python
class Person():
	def __init__(self,name,age):
		self.name = name
		self.age = age
	def fun(self):
		print(f"我是{self.name},今年{self.age}岁")

class bask_person(Person):
	def __init__(self, name, age):
		super().__init__(name, age) # 调用父类 Person 的初始化方法
		print(f"我是{self.name},今年{self.age}岁，会打篮球")

class sing_person(Person):
	def __init__(self, name, age):
		super().__init__(name, age)
		print(f"我是{self.name},今年{self.age}岁，会唱歌")
	def fun(self):
		print("我喜欢唱歌") # 重载父类的 fun 方法

people1 = bask_person("01", 25)
people2 = sing_person("02", 24)
people1.fun() #调用父类的 fun 方法
```

#### 多态

多态指的是一类事物有多种形态，其表现为同一个方法或操作，在不同的对象上有不同的表现形式。多态是一种使用对象的方式，具体而言：子类可以**重载**父类的方法。当调用相同名称的方法时，不同子类的对象会表现出不同的行为。

```python
class Animal():
	def eat(self):
		pass

class Dog(Animal):
	def eat(self):
		print("骨头")

class Cat(Animal):
	def eat(self):
		print("鱼")

class Pig(Animal):
	def eat(self):
		print("everything")

dog = Dog()
cat = Cat()
pig = Pig()

def Eat(animal):
	animal.eat() # 只要传入对象有 eat() 方法就可以

Eat(cat) # 骨头
Eat(dog) # 鱼
Eat(pig) # everything
```

### 双下划线方法

**双下划线方法**是 python 中一些具有特殊功能的方法，以双下划线 `__` 开头和结尾。
```python
class List_1:
	def __init__(self, lst):
	"""
	初始化方法
	参数：
		lst (list)：要包装的列表
	"""
		self.lst = lst
	
	def __getitem__(self, index):
	"""
	获取指定索引位置的元素
	"""
		return self.lst[index]
	
	def __delitem__(self, index):
	"""
	删除指定索引位置的元素。
	"""
		del self.lst[index]
	
	def __len__(self):
	"""
	返回列表的长度
	"""
		return len(self.lst)
	
	def append(self, item):
	"""
	向列表末尾添加一个新元素
	"""
		self.lst.append(item)
	
my_list = [1, 2, 3, 4, 5]

wrapper = List_1(my_list) # 实例化一个 List_1 对象，传入列表作为参数

print(wrapper.__getitem__(2)) # 调用双下划线方法获取列表中第三个元素
```

## pytorch 基础知识

尚未更新~